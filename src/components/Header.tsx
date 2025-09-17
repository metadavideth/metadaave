"use client"

import { useEffect, useState } from "react"

// Mock Farcaster data for development
const mockFarcasterUser = {
  fid: 123,
  username: "user",
  displayName: "User",
  address: "0x1234567890abcdef1234567890abcdef12345678"
}

function shortenAddress(address?: string) {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Check if we're in a Farcaster Mini App environment
function isFarcasterEnvironment() {
  if (typeof window === "undefined") return false
  
  // Check for Farcaster SDK
  if ((window as any).farcaster) return true
  
  // Check for Farcaster previewer or iframe context
  if (window.location.hostname.includes("farcaster") || 
      window.location.search.includes("farcaster") ||
      window.location.search.includes("preview") ||
      window.parent !== window) return true
  
  // Check for Farcaster user agent or referrer
  if (navigator.userAgent.includes("farcaster") || 
      document.referrer.includes("farcaster")) return true
  
  return false
}

// Get Farcaster SDK instance (assumes it's already initialized by App)
async function getFarcasterSDK() {
  if (typeof window === "undefined") return null
  
  try {
    if (isFarcasterEnvironment()) {
      const { sdk } = await import("@farcaster/miniapp-sdk")
      return sdk
    }
  } catch (error) {
    console.warn("Failed to get Farcaster SDK:", error)
  }
  
  return null
}

export function Header() {
  const [isConnected, setIsConnected] = useState(false)
  const [username, setUsername] = useState<string>("")
  const [address, setAddress] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    
    async function init() {
      try {
        setIsLoading(true)
        
        // Get Farcaster SDK (already initialized by App)
        const sdk = await getFarcasterSDK()
        
        if (sdk) {
          // We're in a Farcaster environment with SDK
          try {
            // Get user context
            const context = await sdk.context.get()
            if (mounted && context?.user) {
              setUsername(context.user.username || "")
              setAddress(context.user.address || "")
              setIsConnected(true)
            }
          } catch (sdkError) {
            console.warn("SDK context error:", sdkError)
            // Fallback to mock data if SDK fails
            if (mounted) {
              setUsername(mockFarcasterUser.username)
              setAddress(mockFarcasterUser.address)
              setIsConnected(true)
            }
          }
        } else {
          // Development mode - use mock data
          if (mounted) {
            setUsername(mockFarcasterUser.username)
            setAddress(mockFarcasterUser.address)
            setIsConnected(true)
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
      
      // Get Farcaster SDK (already initialized by App)
      const sdk = await getFarcasterSDK()
      
      if (sdk) {
        // We're in a Farcaster environment with SDK
        try {
          // Use QuickAuth for authentication
          const auth = await sdk.quickAuth.signIn()
          if (auth?.user) {
            setUsername(auth.user.username || "")
            setAddress(auth.user.address || "")
            setIsConnected(true)
          }
        } catch (sdkError) {
          console.warn("SDK auth error:", sdkError)
          // Fallback to mock data if SDK fails
          setUsername(mockFarcasterUser.username)
          setAddress(mockFarcasterUser.address)
          setIsConnected(true)
        }
      } else {
        // Development mode
        setUsername(mockFarcasterUser.username)
        setAddress(mockFarcasterUser.address)
        setIsConnected(true)
      }
    } catch (e: any) {
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
                className="bg-secondary text-secondary-foreground border border-border rounded-lg px-4 py-2 text-sm"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Connecting..." : "Connect with Farcaster"}
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
