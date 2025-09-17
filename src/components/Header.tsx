"use client"

import { useEffect, useState } from "react"
import { MiniApp } from "@farcaster/miniapp-sdk"

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
        const app = new MiniApp()
        await app.ready()

        const auth = await app.auth.getUser()
        if (mounted && auth?.user) {
          setUsername(auth.user.username || "")
          // Integrated wallet (if available via SDK)
          const wallet = await app.ethereum.getAccount().catch(() => null)
          setAddress(wallet?.address || "")
          setIsConnected(true)
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
      const app = new MiniApp()
      await app.ready()
      const auth = await app.auth.requestUser()
      if (auth?.user) {
        setUsername(auth.user.username || "")
        const wallet = await app.ethereum.getAccount().catch(() => null)
        setAddress(wallet?.address || "")
        setIsConnected(true)
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to authenticate with Farcaster")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const app = new MiniApp()
      await app.ready()
      await app.auth.logout().catch(() => null)
    } finally {
      setUsername("")
      setAddress("")
      setIsConnected(false)
    }
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
