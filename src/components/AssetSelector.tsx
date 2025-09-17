"use client"

import { useState } from "react"
import { AAVE_V3_BASE_TOKENS } from "../data/tokens"
import type { Token } from "../types"

interface AssetSelectorProps {
  selectedToken?: Token
  onTokenSelect?: (token: Token) => void
}

export function AssetSelector({ selectedToken, onTokenSelect }: AssetSelectorProps) {
  const [localSelectedToken, setLocalSelectedToken] = useState<Token | null>(selectedToken || null)

  const handleTokenClick = (token: Token) => {
    setLocalSelectedToken(token)
    onTokenSelect?.(token)
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 text-card-foreground">Select Asset</h2>

      <div className="grid grid-cols-2 gap-3">
        {AAVE_V3_BASE_TOKENS.map((token) => (
          <button
          key={token.symbol}
          onClick={() => handleTokenClick(token)}
          className={`token-button w-full text-left ${
            localSelectedToken?.symbol === token.symbol
              ? "border-primary bg-primary"
              : "hover:border-muted"
          }`}
        >
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{token.icon}</span>
              <div className="text-left">
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

            <div className="text-left">
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
                {token.apy}
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
              <span className="font-medium text-card-foreground">{localSelectedToken.symbol}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
