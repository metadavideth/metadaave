"use client"

import { useEffect, useState } from "react"
import { initMiniAppAuth, isFarcasterEnvironment, mockFarcasterUser } from "../utils/farcaster"

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
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    let mounted = true
    
    async function init() {
      try {
        setIsLoading(true)
        
        // Check if we should try Farcaster environment
        const isFarcasterEnv = isFarcasterEnvironment()
        
        // Collect debug information
        const debugData = {
          isFarcasterEnv,
          hostname: window.location.hostname,
          hasFarcasterSDK: !!(window as any).FarcasterMiniApp,
          isIframe: window.self !== window.top,
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          searchParams: window.location.search,
          windowKeys: Object.keys(window).slice(0, 10),
          scripts: Array.from(document.scripts).map(s => s.src),
          timestamp: new Date().toISOString()
        }
        
        if (mounted) {
          setDebugInfo(debugData)
        }
        
        console.log("Farcaster environment check:", debugData)
        
        if (isFarcasterEnv) {
          // Attempt Farcaster authentication
          const { token, user } = await initMiniAppAuth()
          
          if (token && user) {
            console.log("Farcaster authentication successful")
            if (mounted) {
              setUsername("Farcaster User")
              setAddress("0x" + user.signature.slice(0, 40)) // Use signature as address placeholder
              setIsConnected(true)
            }
          } else {
            console.log("Farcaster authentication failed")
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
    try {
      setIsLoading(true)
      setError(null)
      
      // Check Farcaster environment
      const isFarcasterEnv = isFarcasterEnvironment()
      
      console.log("Connect attempt - Farcaster environment check:", {
        isFarcasterEnv,
        hostname: window.location.hostname
      })
      
      if (isFarcasterEnv) {
        // Attempt Farcaster authentication
        const { token, user } = await initMiniAppAuth()
        
        if (token && user) {
          setUsername("Farcaster User")
          setAddress("0x" + user.signature.slice(0, 40)) // Use signature as address placeholder
          setIsConnected(true)
        } else {
          setError("Please connect your Farcaster wallet")
        }
      } else {
        // Not in Farcaster environment, allow mock data for testing
        console.log("Not in Farcaster environment for connection - using mock data for testing")
        setUsername(mockFarcasterUser.username)
        setAddress(mockFarcasterUser.address)
        setIsConnected(true)
        setError("Using mock data for testing. For real authentication, access via Farcaster/Warpcast.")
      }
    } catch (e: any) {
      console.error("Connection error:", e)
      setError(e?.message ?? "Failed to authenticate with Farcaster")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setUsername("")
    setAddress("")
    setIsConnected(false)
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
          
          {/* Debug toggle button */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="bg-gray-500 text-white rounded-lg px-3 py-2 text-xs hover:bg-gray-600 transition-colors"
          >
            {showDebug ? "Hide Debug" : "Show Debug"}
          </button>
        </div>
      </div>
      {error ? (
        <div className="mt-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
      
      {/* Debug Panel */}
      {showDebug && debugInfo && (
        <div className="mt-4 p-4 bg-gray-900 text-white text-xs rounded-lg">
          <h3 className="font-bold mb-2">🐛 Debug Information</h3>
          <div className="space-y-1">
            <div><strong>Environment:</strong> {debugInfo.isFarcasterEnv ? "✅ Farcaster" : "❌ Not Farcaster"}</div>
            <div><strong>Hostname:</strong> {debugInfo.hostname}</div>
            <div><strong>Is Iframe:</strong> {debugInfo.isIframe ? "✅ Yes" : "❌ No"}</div>
            <div><strong>Has SDK:</strong> {debugInfo.hasFarcasterSDK ? "✅ Yes" : "❌ No"}</div>
            <div><strong>Referrer:</strong> {debugInfo.referrer || "None"}</div>
            <div><strong>Search Params:</strong> {debugInfo.searchParams || "None"}</div>
            <div><strong>User Agent:</strong> {debugInfo.userAgent.substring(0, 50)}...</div>
            <div><strong>Window Keys:</strong> {debugInfo.windowKeys.join(", ")}</div>
            <div><strong>Scripts:</strong> {debugInfo.scripts.length} loaded</div>
            <div><strong>Script URLs:</strong> {debugInfo.scripts.join(", ")}</div>
            <div><strong>Timestamp:</strong> {debugInfo.timestamp}</div>
          </div>
        </div>
      )}
    </header>
  )
}
