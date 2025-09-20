"use client"

import { useState, useEffect } from "react"
import { AAVE_V3_BASE_TOKENS } from "../data/tokens"
import { useAaveTransactions, calculateTransactionFee } from "../hooks/useAaveTransactions"
import { useTokenPosition } from "../hooks/useUserPositions"
import type { Token } from "../types"

interface ActionTabsProps {
  onTransactionSuccess: (action: string, amount: string, token: string) => void
  selectedToken?: Token
}

type TabType = "supply" | "borrow" | "repay" | "withdraw"

export function ActionTabs({ onTransactionSuccess, selectedToken }: ActionTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("supply")
  const [currentToken, setCurrentToken] = useState<Token>(selectedToken || AAVE_V3_BASE_TOKENS[0])
  const [amount, setAmount] = useState("")
  const [fee, setFee] = useState("0.00")
  const [error, setError] = useState<string | null>(null)

  const { supply, borrow, repay, withdraw } = useAaveTransactions()
  const { position, isLoading: positionLoading } = useTokenPosition(currentToken.address)

  useEffect(() => {
    if (selectedToken) {
      setCurrentToken(selectedToken)
    }
  }, [selectedToken])

  // Reset amount when switching between action types
  useEffect(() => {
    setAmount("")
    setFee("0.00")
  }, [activeTab])

  const tabs = [
    { id: "supply", label: "Supply", color: "text-green-500" },
    { id: "borrow", label: "Borrow", color: "text-blue-400" },
    { id: "repay", label: "Repay", color: "text-orange-400" },
    { id: "withdraw", label: "Withdraw", color: "text-purple-400" },
  ]

  const handleTransaction = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) return

    setError(null)

    try {
      const transactionParams = {
        token: currentToken,
        amount: amount,
      }

      let result
      switch (activeTab) {
        case 'supply':
          result = await supply.mutateAsync(transactionParams)
          break
        case 'borrow':
          result = await borrow.mutateAsync(transactionParams)
          break
        case 'repay':
          result = await repay.mutateAsync(transactionParams)
          break
        case 'withdraw':
          result = await withdraw.mutateAsync(transactionParams)
          break
        default:
          throw new Error('Invalid action')
      }

      onTransactionSuccess(activeTab, amount, currentToken.symbol)
      setAmount("")
      setFee("0.00")
    } catch (err) {
      console.error('Transaction failed:', err)
      setError(err instanceof Error ? err.message : 'Transaction failed')
    }
  }

  const getCurrentMutation = () => {
    switch (activeTab) {
      case 'supply': return supply
      case 'borrow': return borrow
      case 'repay': return repay
      case 'withdraw': return withdraw
      default: return supply
    }
  }

  const isLoading = getCurrentMutation().isPending

  const getButtonText = () => {
    if (isLoading) return "Processing..."
    switch (activeTab) {
      case "supply":
        return `Supply ${currentToken.symbol}`
      case "borrow":
        return `Borrow ${currentToken.symbol}`
      case "repay":
        return `Repay ${currentToken.symbol}`
      case "withdraw":
        return `Withdraw ${currentToken.symbol}`
    }
  }

  const getBalanceLabel = () => {
    switch (activeTab) {
      case "supply":
        return "Wallet Balance"
      case "borrow":
        return "Available to Borrow"
      case "repay":
        return "Debt Balance"
      case "withdraw":
        return "Supplied Balance"
    }
  }

  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount)
    setError(null) // Clear error when amount changes
    if (newAmount && Number.parseFloat(newAmount) > 0) {
      setFee(calculateTransactionFee(newAmount))
    } else {
      setFee("0.00")
    }
  }

  const getMaxAmount = () => {
    if (positionLoading || !position) {
      return "0"
    }
    
    switch (activeTab) {
      case "supply":
        // For supply, use wallet balance
        const balancePart = currentToken.balance.split(" ")[0]
        return balancePart.replace(/,/g, '')
      case "borrow":
        // For borrow, use available borrowing power
        return position.availableToBorrow
      case "repay":
        // For repay, use current debt amount
        return position.availableToRepay
      case "withdraw":
        // For withdraw, use supplied amount
        return position.availableToWithdraw
      default:
        return "0"
    }
  }

  const getDisplayAmount = () => {
    if (positionLoading) {
      return "Loading..."
    }
    
    if (!position) {
      return "0"
    }
    
    switch (activeTab) {
      case "supply":
        return currentToken.balance
      case "borrow":
        return `${position.availableToBorrow} ${currentToken.symbol}`
      case "repay":
        return `${position.availableToRepay} ${currentToken.symbol}`
      case "withdraw":
        return `${position.availableToWithdraw} ${currentToken.symbol}`
      default:
        return "0"
    }
  }

  return (
    <div className="card">
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-background rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-card text-card-foreground" : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-card-foreground">Amount</label>
          <div className="text-xs text-muted-foreground">
            {getBalanceLabel()}: {getDisplayAmount()}
          </div>
        </div>

        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            className="w-full input-field pr-16"
          />
          <button
            onClick={() => handleAmountChange(getMaxAmount())}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-primary hover:text-primary/80"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="text-sm text-destructive font-medium">Transaction Failed</div>
          <div className="text-xs text-destructive/80 mt-1">{error}</div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleTransaction}
        disabled={!amount || Number.parseFloat(amount) <= 0 || isLoading}
        className="w-full py-4 px-6 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-semibold text-lg rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {getButtonText()}
      </button>

      {/* Transaction Preview */}
      {amount && Number.parseFloat(amount) > 0 && (
        <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border">
          <div className="text-xs text-muted-foreground mb-2">Transaction Preview</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Action:</span>
              <span className="capitalize text-card-foreground">{activeTab}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="text-card-foreground">
                {amount} {currentToken.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network:</span>
              <span className="text-card-foreground">Base</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Protocol:</span>
              <span className="text-card-foreground">Aave V3</span>
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee (0.1%):</span>
                <span className="text-card-foreground">
                  {fee} {currentToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gas Fee:</span>
                <span className="text-card-foreground">~$0.50</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
