"use client"

import { useState, useEffect } from "react"
import { useTokensWithBalances } from "../hooks/useTokenBalances"
import type { Token } from "../types"

interface AssetSelectorProps {
  selectedToken?: Token
  onTokenSelect?: (token: Token) => void
}

export function AssetSelector({ selectedToken, onTokenSelect }: AssetSelectorProps) {
  const [localSelectedToken, setLocalSelectedToken] = useState<Token | null>(selectedToken || null)
  const { tokens, isLoading, error, isConnected } = useTokensWithBalances()

  // Update local selected token when prop changes
  useEffect(() => {
    if (selectedToken) {
      setLocalSelectedToken(selectedToken)
    }
  }, [selectedToken])

  const handleTokenClick = (token: Token) => {
    setLocalSelectedToken(token)
    onTokenSelect?.(token)
  }

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 text-card-foreground">Select Asset</h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading real-time data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 text-card-foreground">Select Asset</h2>
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Using demo data - Aave subgraph unavailable
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {tokens.map((token) => (
            <button
              key={token.symbol}
              onClick={() => handleTokenClick(token)}
              className={`token-button w-full text-left p-3 rounded-lg border transition-all ${
                localSelectedToken?.symbol === token.symbol
                  ? "border-primary bg-primary text-white"
                  : "border-border hover:border-muted bg-card hover:bg-accent"
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{token.icon}</span>
                <div className="text-left flex-1 min-w-0">
                  <div
                    className={`font-medium text-sm ${
                      localSelectedToken?.symbol === token.symbol ? "text-white" : "text-card-foreground"
                    }`}
                  >
                    {token.symbol}
                  </div>
                  <div
                    className={`text-xs truncate ${
                      localSelectedToken?.symbol === token.symbol ? "text-white/80" : "text-muted-foreground"
                    }`}
                  >
                    {token.name}
                  </div>
                </div>
              </div>

              {/* APY Data */}
              <div className="grid grid-cols-2 gap-2 text-left">
                <div>
                  <div
                    className={`text-xs ${
                      localSelectedToken?.symbol === token.symbol ? "text-white/80" : "text-muted-foreground"
                    }`}
                  >
                    Supply APY
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      localSelectedToken?.symbol === token.symbol ? "text-white" : "text-green-500"
                    }`}
                  >
                    {token.supplyAPY ? `${token.supplyAPY.toFixed(2)}%` : token.apy}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-xs ${
                      localSelectedToken?.symbol === token.symbol ? "text-white/80" : "text-muted-foreground"
                    }`}
                  >
                    Borrow APY
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      localSelectedToken?.symbol === token.symbol ? "text-white" : "text-orange-500"
                    }`}
                  >
                    {token.borrowAPY ? `${token.borrowAPY.toFixed(2)}%` : 'N/A'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 text-card-foreground">Select Asset</h2>
      
      {isConnected && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            📊 Real-time data from Aave V3 on Base
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {tokens.map((token) => (
          <button
            key={token.symbol}
            onClick={() => handleTokenClick(token)}
            className={`token-button w-full text-left p-3 rounded-lg border transition-all ${
              localSelectedToken?.symbol === token.symbol
                ? "border-primary bg-primary text-white"
                : "border-border hover:border-muted bg-card hover:bg-accent"
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{token.icon}</span>
              <div className="text-left flex-1 min-w-0">
                <div
                  className={`font-medium text-sm ${
                    localSelectedToken?.symbol === token.symbol ? "text-white" : "text-card-foreground"
                  }`}
                >
                  {token.symbol}
                </div>
                <div
                  className={`text-xs truncate ${
                    localSelectedToken?.symbol === token.symbol ? "text-white/80" : "text-muted-foreground"
                  }`}
                >
                  {token.name}
                </div>
              </div>
            </div>

            {/* User Balance */}
            {isConnected && (
              <div className="mb-2">
                <div
                  className={`text-xs ${
                    localSelectedToken?.symbol === token.symbol ? "text-white/80" : "text-muted-foreground"
                  }`}
                >
                  Your Balance
                </div>
                <div
                  className={`text-sm font-medium ${
                    localSelectedToken?.symbol === token.symbol ? "text-white" : "text-foreground"
                  }`}
                >
                  {token.userBalanceFormatted} {token.symbol}
                </div>
              </div>
            )}

            {/* APY Data */}
            <div className="grid grid-cols-2 gap-2 text-left">
              <div>
                <div
                  className={`text-xs ${
                    localSelectedToken?.symbol === token.symbol ? "text-white/80" : "text-muted-foreground"
                  }`}
                >
                  Supply APY
                </div>
                <div
                  className={`text-sm font-medium ${
                    localSelectedToken?.symbol === token.symbol ? "text-white" : "text-green-500"
                  }`}
                >
                  {token.supplyAPY ? `${token.supplyAPY.toFixed(2)}%` : token.apy}
                </div>
              </div>
              <div>
                <div
                  className={`text-xs ${
                    localSelectedToken?.symbol === token.symbol ? "text-white/80" : "text-muted-foreground"
                  }`}
                >
                  Borrow APY
                </div>
                <div
                  className={`text-sm font-medium ${
                    localSelectedToken?.symbol === token.symbol ? "text-white" : "text-orange-500"
                  }`}
                >
                  {token.borrowAPY ? `${token.borrowAPY.toFixed(2)}%` : 'N/A'}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {localSelectedToken && (
        <div className="mt-4 p-3 bg-card rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{localSelectedToken.icon}</span>
              <div>
                <div className="font-medium text-card-foreground">{localSelectedToken.symbol}</div>
                <div className="text-xs text-muted-foreground">{localSelectedToken.name}</div>
              </div>
            </div>
            {isConnected && localSelectedToken.userBalanceFormatted && (
              <div className="text-right">
                <div className="text-sm font-medium text-card-foreground">
                  {localSelectedToken.userBalanceFormatted} {localSelectedToken.symbol}
                </div>
                <div className="text-xs text-muted-foreground">Your Balance</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
