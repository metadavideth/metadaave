"use client"

import { useEffect, useState } from "react"
import { getFarcasterSDK, waitForFarcasterSDK, isFarcasterEnvironment, mockFarcasterUser } from "../utils/farcaster"

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
        
        // Check if we should try Farcaster environment
        const isFarcasterEnv = isFarcasterEnvironment()
        
        console.log("Farcaster environment check:", {
          isFarcasterEnv,
          hostname: window.location.hostname,
          hasFarcasterSDK: !!(window as any).FarcasterMiniApp
        })
        
        if (isFarcasterEnv) {
          // Try to get Farcaster SDK, waiting for it to load if needed
          let sdk
          try {
            sdk = await waitForFarcasterSDK(3000) // Wait up to 3 seconds
            console.log("Farcaster SDK loaded:", !!sdk)
          } catch (error) {
            console.warn("Failed to load Farcaster SDK:", error)
            sdk = null
          }
          
          if (sdk) {
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
              console.error("SDK authentication check error:", sdkError)
              console.error("Error details:", {
                message: sdkError instanceof Error ? sdkError.message : 'Unknown error',
                stack: sdkError instanceof Error ? sdkError.stack : undefined,
                name: sdkError instanceof Error ? sdkError.name : undefined
              })
              // Don't fallback to mock data automatically - let user try to connect
              if (mounted) {
                console.log("SDK error occurred, user will need to manually connect")
                setError(`Farcaster SDK error: ${sdkError instanceof Error ? sdkError.message : 'Unknown error'}`)
              }
            }
          } else {
            // SDK not available, don't auto-connect
            console.log("Farcaster SDK not available, user will need to connect manually")
            if (mounted) {
              setError("Farcaster SDK not available. Please try connecting manually.")
            }
          }
        } else {
          // Not in Farcaster environment, don't auto-connect
          console.log("Not in Farcaster environment, user will need to connect manually")
          if (mounted) {
            setError("Not in Farcaster environment. Please try connecting manually.")
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
        // Try to get Farcaster SDK, waiting for it to load if needed
        let sdk
        try {
          sdk = await waitForFarcasterSDK(3000) // Wait up to 3 seconds
          console.log("Farcaster SDK loaded for connect:", !!sdk)
        } catch (error) {
          console.warn("Failed to load Farcaster SDK for connect:", error)
          sdk = null
        }
        
        if (sdk) {
          // We're in a Farcaster environment with SDK
          try {
            console.log("Attempting Farcaster authentication...")
            console.log("SDK actions available:", Object.keys(sdk.actions || {}))
            
            // Try different authentication approaches
            let authResult
            try {
              // First try the authenticate method
              authResult = await sdk.actions.authenticate()
              console.log("Farcaster authenticate() result:", authResult)
            } catch (authError) {
              console.warn("authenticate() failed, trying alternative approach:", authError)
              // Try alternative authentication method
              if (sdk.actions.openSigner) {
                authResult = await sdk.actions.openSigner()
                console.log("Farcaster openSigner() result:", authResult)
              } else {
                throw authError
              }
            }
            
            // Check if authentication was successful
            const isAuthSuccess = authResult && (
              authResult.success === true || 
              authResult === true ||
              (typeof authResult === 'object' && authResult.success !== false)
            )
            
            console.log("Authentication success check:", isAuthSuccess)
            
            if (isAuthSuccess) {
              // Get user data after successful authentication
              const userData = await sdk.actions.getUserData()
              console.log("Farcaster user data after auth:", userData)
              
              if (userData) {
                setUsername(userData.username || "")
                setAddress(userData.address || userData.verifiedAddresses?.[0] || "")
                setIsConnected(true)
              } else {
                throw new Error("No user data received after authentication")
              }
            } else {
              throw new Error(`Authentication failed - result: ${JSON.stringify(authResult)}`)
            }
          } catch (sdkError) {
            console.error("SDK auth error:", sdkError)
            console.error("Auth error details:", {
              message: sdkError instanceof Error ? sdkError.message : 'Unknown error',
              stack: sdkError instanceof Error ? sdkError.stack : undefined,
              name: sdkError instanceof Error ? sdkError.name : undefined
            })
            setError(`Farcaster authentication failed: ${sdkError instanceof Error ? sdkError.message : 'Unknown error'}`)
            // Don't automatically fallback to mock data - let user retry
          }
        } else {
          // SDK not available, don't auto-connect
          console.log("Farcaster SDK not available for connection")
          setError("Farcaster SDK not available. Please refresh and try again.")
        }
      } else {
        // Not in Farcaster environment, don't auto-connect
        console.log("Not in Farcaster environment for connection")
        setError("Not in Farcaster environment. Please access via Farcaster/Warpcast.")
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
