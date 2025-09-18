"use client"

import { useEffect, useState } from "react"
import { getFarcasterSDK, isFarcasterEnvironment, mockFarcasterUser } from "../utils/farcaster"

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

  useEffect(() => {
    let mounted = true
    
    async function init() {
      try {
        setIsLoading(true)
        
        // Get Farcaster SDK
        const sdk = getFarcasterSDK()
        const isFarcasterEnv = isFarcasterEnvironment()
        
        console.log("Farcaster environment check:", {
          sdk: !!sdk,
          isFarcasterEnv,
          hostname: window.location.hostname,
          hasFarcasterSDK: !!(window as any).FarcasterMiniApp
        })
        
        if (sdk && isFarcasterEnv) {
          // We're in a Farcaster environment with SDK
          try {
            console.log("Attempting Farcaster authentication...")
            // Check if user is already authenticated
            const isAuthenticated = await sdk.actions.isAuthenticated()
            console.log("Farcaster authentication status:", isAuthenticated)
            
            if (isAuthenticated) {
              // Get user data
              const userData = await sdk.actions.getUserData()
              console.log("Farcaster user data:", userData)
              
              if (mounted && userData) {
                setUsername(userData.username || "")
                setAddress(userData.address || userData.verifiedAddresses?.[0] || "")
                setIsConnected(true)
              }
            } else {
              console.log("User not authenticated, will need to connect")
            }
          } catch (sdkError) {
            console.warn("SDK authentication check error:", sdkError)
            // Fallback to mock data if SDK fails
            if (mounted) {
              console.log("Falling back to mock data due to SDK error")
              setUsername(mockFarcasterUser.username)
              setAddress(mockFarcasterUser.address)
              setIsConnected(true)
            }
          }
        } else {
          // Development mode or previewer - use mock data
          console.log("Using mock data - not in Farcaster environment")
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
      setError(null)
      
      // Get Farcaster SDK
      const sdk = getFarcasterSDK()
      const isFarcasterEnv = isFarcasterEnvironment()
      
      console.log("Connect attempt - Farcaster environment check:", {
        sdk: !!sdk,
        isFarcasterEnv,
        hostname: window.location.hostname
      })
      
      if (sdk && isFarcasterEnv) {
        // We're in a Farcaster environment with SDK
        try {
          console.log("Attempting Farcaster authentication...")
          // Use authenticate method for sign-in
          const authResult = await sdk.actions.authenticate()
          console.log("Farcaster authentication result:", authResult)
          
          if (authResult && authResult.success) {
            // Get user data after successful authentication
            const userData = await sdk.actions.getUserData()
            console.log("Farcaster user data after auth:", userData)
            
            if (userData) {
              setUsername(userData.username || "")
              setAddress(userData.address || userData.verifiedAddresses?.[0] || "")
              setIsConnected(true)
            }
          } else {
            throw new Error("Authentication failed - no success response")
          }
        } catch (sdkError) {
          console.warn("SDK auth error:", sdkError)
          setError(`Farcaster authentication failed: ${sdkError instanceof Error ? sdkError.message : 'Unknown error'}`)
          // Fallback to mock data if SDK fails (for previewer)
          setUsername(mockFarcasterUser.username)
          setAddress(mockFarcasterUser.address)
          setIsConnected(true)
        }
      } else {
        // Development mode or previewer - use mock data
        console.log("Using mock data for connection - not in Farcaster environment")
        setUsername(mockFarcasterUser.username)
        setAddress(mockFarcasterUser.address)
        setIsConnected(true)
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
