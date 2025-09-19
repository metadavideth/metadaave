"use client"

import { useEffect, useState } from "react"
import { initMiniAppAuth, isFarcasterEnvironment, mockFarcasterUser } from "../utils/farcaster"
import { makeSiweNonce } from "../utils/auth"
import { sdk as farcasterSDK } from "@farcaster/miniapp-sdk"
import { verifyFarcasterWallet, verifyWalletWithSdkProvider } from "../lib/verifyWallet"
import { makeSdkEthProvider } from "../lib/farcasterEth"
import { sdkHasEthBridge } from "../lib/sdkHasEthBridge"
import { Notice } from "./Notice"
import { useWallet } from "../contexts/WalletContext"

function shortenAddress(address?: string) {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function Header() {
  const [isConnected, setIsConnected] = useState(false)
  const [username, setUsername] = useState<string>("")
  const [address, setAddress] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const { farcasterWalletAddress, chainId, setFarcasterWalletAddress, setChainId } = useWallet()
  
  // Check if SDK has ETH bridge
  const hasBridge = sdkHasEthBridge(farcasterSDK)
  
  // Debug logging for bridge detection
  console.log('[bridge] SDK actions:', Object.keys(farcasterSDK?.actions || {}))
  console.log('[bridge] has ethProviderRequestV2:', typeof farcasterSDK?.actions?.ethProviderRequestV2)
  console.log('[bridge] has ethProviderRequest:', typeof farcasterSDK?.actions?.ethProviderRequest)
  console.log('[bridge] has openUrl:', typeof farcasterSDK?.actions?.openUrl)
  console.log('[bridge] hasBridge result:', hasBridge)

  useEffect(() => {
    let mounted = true
    
    async function init() {
      try {
        setIsLoading(true)
        
        // Check if we should try Farcaster environment
        const isFarcasterEnv = isFarcasterEnvironment()
        
        console.log("Farcaster environment check:", {
          isFarcasterEnv,
          hostname: window.location.hostname,
          isIframe: window.self !== window.top,
          hasFarcasterSDK: !!(window as any).FarcasterMiniApp,
          referrer: document.referrer
        })
        
        if (isFarcasterEnv) {
          // Check if we already have a token without triggering auth
          try {
            await farcasterSDK.actions.ready()
            const existingToken = farcasterSDK.quickAuth.token
            if (existingToken) {
              console.log("Found existing Farcaster token")
              if (mounted) {
                setUsername("Farcaster User")
                setAddress("0x" + existingToken.slice(0, 40)) // Use token as address placeholder
                setIsConnected(true)
              }
            } else {
              console.log("No existing token, user needs to connect")
              if (mounted) {
                setError("Please connect your Farcaster wallet")
              }
            }
          } catch (error) {
            console.log("SDK not ready, user needs to connect")
            if (mounted) {
              setError("Please connect your Farcaster wallet")
            }
          }
        } else {
          // Not in Farcaster environment, show appropriate message
          console.log("Not in Farcaster environment, user will need to connect manually")
          if (mounted) {
            setError("Not in Farcaster environment. Please access this app via Farcaster/Warpcast to use real authentication, or use the connect button to test with mock data.")
          }
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to initialize Farcaster Mini App")
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    
    init()
    return () => {
      mounted = false
    }
  }, [])

  const handleConnect = async () => {
    // Prevent double in-flight sign-ins
    if (isAuthenticating) {
      console.log("Authentication already in progress, ignoring click")
      return
    }

    try {
      setIsLoading(true)
      setIsAuthenticating(true)
      setError(null)
      
      // Log environment and ensure we don't skip due to a fragile detector
      console.log('[auth] inIframe', window.top !== window.self);
      console.log('[auth] sdk.version', farcasterSDK?.version);
      console.log('[auth] actions', Object.keys(farcasterSDK?.actions || {}));

      console.log('[auth] pre token', farcasterSDK.quickAuth.token);
      await farcasterSDK.actions.ready();
      console.log('[auth] ready:ok');

      // If sdk.quickAuth.token exists, skip signIn and set authed=true
      const pre = farcasterSDK.quickAuth.token;
      console.log('[auth] preexisting token', pre);

      let token = pre;
      let siweSignerAddress: string | undefined;
      
      if (!token) {
        // Generate and validate nonce
        const nonce = makeSiweNonce(16)
        console.log('[auth] nonce (local):', nonce, 'alnum?', /^[a-z0-9]+$/i.test(nonce))
        
        // Call sdk.actions.signIn({ nonce }) unconditionally when user clicks Connect
        const result = await farcasterSDK.actions.signIn({ nonce })
        console.log('[auth] signIn full result:', JSON.parse(JSON.stringify(result)));
        
        // Extract SIWE signer address from result
        siweSignerAddress = (result?.address ?? result?.siwe?.address ?? result?.message?.address ?? '').toLowerCase() || undefined;
        
        // Immediately call await sdk.quickAuth.getToken() and treat a truthy token as authenticated
        const got = await farcasterSDK.quickAuth.getToken().catch(() => undefined);
        token = got?.token ?? got; // depending on SDK return shape
        console.log('[auth] token after signIn', token);
      }

      if (!token) {
        setError("Please connect your Farcaster wallet")
        return
      }

      console.log("[wallet] starting verification via Farcaster SDK bridge only...");
      try {
        const eth = makeSdkEthProvider(farcasterSDK);
        const result = await verifyWalletWithSdkProvider(eth);
        console.log("[wallet] verified via Farcaster bridge:", result);
        setFarcasterWalletAddress(result.address);
        setChainId(`0x${result.chainId.toString(16)}`);
      } catch (err) {
        console.error("[wallet] verification failed (SDK bridge):", err);
        setError(err instanceof Error ? err.message : 'Wallet verification failed');
        return;
      }

      setUsername("Farcaster User")
      setAddress(result.address)
      setIsConnected(true)
    } catch (e: any) {
      console.error("Connection error:", e)
      setError(e?.message ?? "Failed to authenticate with Farcaster")
    } finally {
      setIsLoading(false)
      setIsAuthenticating(false)
    }
  }

  const handleDisconnect = async () => {
    setUsername("")
    setAddress("")
    setIsConnected(false)
    setFarcasterWalletAddress(undefined)
    setChainId(undefined)
  }

  // Show fallback UI if no ETH bridge available
  if (!hasBridge) {
    return (
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-lg">
              🌐
            </div>
            <h1 className="text-xl font-bold text-card-foreground">metadaave</h1>
          </div>
        </div>
        <Notice
          title="Wallet actions not available in this environment"
          body="You are currently in the Farcaster wallet web interface. The Ethereum provider bridge is only available in the Farcaster mobile app. To use wallet features, please open this Mini App in the Farcaster mobile app."
          ctaLabel="Get Mobile App Instructions"
          onCta={() => {
            // Check if we're already in a Farcaster environment
            const isInFarcasterIframe = window.top !== window.self;
            const isInFarcasterWallet = window.location.hostname.includes('wallet.farcaster.xyz');
            
            console.log('[deep-link] Environment check:', {
              isInFarcasterIframe,
              isInFarcasterWallet,
              hostname: window.location.hostname,
              hasOpenUrl: !!farcasterSDK?.actions?.openUrl
            });
            
            if (isInFarcasterIframe || isInFarcasterWallet) {
              // We're already in Farcaster - show helpful message instead of trying to open new tab
              alert('You are already in the Farcaster wallet! The ETH bridge is not available in this environment. Please open this Mini App in the Farcaster mobile app for full functionality.');
              return;
            }
            
            // Only try deep linking if we're NOT in Farcaster environment
            const currentUrl = window.location.href;
            
            // Try SDK method first (for mobile app context)
            if (farcasterSDK?.actions?.openUrl) {
              try {
                // Use a proper deep link format for mobile app
                const deepLink = `farcaster://miniapp?url=${encodeURIComponent(currentUrl)}`;
                console.log('[deep-link] Trying SDK openUrl with:', deepLink);
                farcasterSDK.actions.openUrl(deepLink);
                return;
              } catch (e) {
                console.warn('SDK openUrl failed:', e);
              }
            }
            
            // Fallback: Copy URL to clipboard with instructions
            navigator.clipboard.writeText(currentUrl).then(() => {
              alert('URL copied to clipboard! Please open the Farcaster mobile app and paste this URL to access the Mini App with full wallet functionality.');
            }).catch(() => {
              alert('Please manually open this URL in the Farcaster mobile app: ' + currentUrl);
            });
          }}
        />
      </header>
    )
  }

  if (isLoading) {
    return (
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-lg">
              🌐
            </div>
            <h1 className="text-xl font-bold text-card-foreground">metadaave</h1>
          </div>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        {/* Left: Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-lg">
            🌐
          </div>
          <h1 className="text-xl font-bold text-card-foreground">metadaave</h1>
        </div>

        {/* Right: Farcaster user info */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <div className="flex items-center gap-2">
                <div className="text-sm">
                  <div className="font-medium text-card-foreground">@{username}</div>
                  <div className="text-xs text-muted-foreground">{shortenAddress(address)}</div>
                </div>
                {farcasterWalletAddress && (
                  <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs">
                    <span>Connected: Farcaster Wallet</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(farcasterWalletAddress)}
                      className="hover:bg-green-200 dark:hover:bg-green-800 rounded px-1"
                      title="Copy address"
                    >
                      📋
                    </button>
                  </div>
                )}
                {chainId && (
                  <div className="text-xs text-muted-foreground">
                    {chainId === '0x2105' ? 'Base' : `Chain ${parseInt(chainId, 16)}`}
                  </div>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                className="bg-secondary text-secondary-foreground border border-border rounded-lg px-4 py-2 text-sm hover:bg-secondary/80 transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              {isLoading ? "Loading..." : "Connect with Farcaster"}
            </button>
          )}
          
        </div>
      </div>
      {error ? (
        <div className="mt-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
      
    </header>
  )
}
