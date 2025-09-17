"use client"

interface HeaderProps {
  isConnected: boolean
  walletAddress: string
  onConnect: () => void
}

export function Header({ isConnected, walletAddress, onConnect }: HeaderProps) {
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

        {/* Right: Wallet Status */}
        <div>
          {isConnected ? (
            <div className="bg-green-900/20 border border-green-700 rounded-lg px-3 py-2">
              <span className="text-green-400 text-sm font-medium">{walletAddress}</span>
            </div>
          ) : (
            <div className="bg-primary border border-primary rounded-lg px-3 py-2">
              <button
                onClick={onConnect}
                className="text-white text-sm font-medium hover:text-white/90 transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
