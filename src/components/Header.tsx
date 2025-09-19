"use client"

import { useEffect, useState } from "react"
import { initMiniAppAuth, isFarcasterEnvironment, mockFarcasterUser } from "../utils/farcaster"
import { makeSiweNonce } from "../utils/auth"
import { sdk as farcasterSDK } from "@farcaster/miniapp-sdk"
import { useAccount, useConnect } from "wagmi"
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
  
  // Use Wagmi hooks for wallet connection
  const { isConnected: wagmiConnected, address: wagmiAddress } = useAccount()
  const { connect, connectors } = useConnect()
  
  // Debug logging for Wagmi connection
  console.log('[wagmi] isConnected:', wagmiConnected)
  console.log('[wagmi] address:', wagmiAddress)
  console.log('[wagmi] connectors:', connectors.length)

  useEffect(() => {
    // Update local state when Wagmi connection changes
    if (wagmiConnected && wagmiAddress) {
      setUsername("Farcaster User")
      setAddress(wagmiAddress)
      setIsConnected(true)
      setError(null)
      // Update context with the connected address
      setFarcasterWalletAddress(wagmiAddress)
    } else {
      setUsername("")
      setAddress("")
      setIsConnected(false)
      setFarcasterWalletAddress(undefined)
      if (!wagmiConnected) {
        setError("Please connect your Farcaster wallet")
      }
    }
    setIsLoading(false)
  }, [wagmiConnected, wagmiAddress, setFarcasterWalletAddress])

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

  // Show fallback UI if not connected to wallet
  if (!wagmiConnected) {
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
          title="Connect your wallet to continue"
          body="This Mini App requires a connected wallet to access DeFi features. Click the button below to connect your Farcaster wallet."
          ctaLabel="Connect Wallet"
          onCta={() => {
            console.log('[connect] Attempting to connect wallet via Wagmi');
            if (connectors.length > 0) {
              connect({ connector: connectors[0] });
            } else {
              console.error('[connect] No connectors available');
            }
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
          {wagmiConnected && wagmiAddress ? (
            <>
              <div className="flex items-center gap-2">
                <div className="text-sm">
                  <div className="font-medium text-card-foreground">Farcaster Wallet</div>
                  <div className="text-xs text-muted-foreground">{shortenAddress(wagmiAddress)}</div>
                </div>
                <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs">
                  <span>Connected</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(wagmiAddress)}
                    className="hover:bg-green-200 dark:hover:bg-green-800 rounded px-1"
                    title="Copy address"
                  >
                    📋
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  // Wagmi doesn't have a direct disconnect, but we can reset our local state
                  setFarcasterWalletAddress(undefined)
                  setChainId(undefined)
                  window.location.reload() // Simple way to reset connection
                }}
                className="bg-secondary text-secondary-foreground border border-border rounded-lg px-4 py-2 text-sm hover:bg-secondary/80 transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                console.log('[connect] Attempting to connect wallet via Wagmi');
                if (connectors.length > 0) {
                  connect({ connector: connectors[0] });
                } else {
                  console.error('[connect] No connectors available');
                }
              }}
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
            >
              Connect Wallet
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
