"use client"

import { useState, useEffect } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { Header } from "./components/Header"
import { AssetSelector } from "./components/AssetSelector"
import { ActionTabs } from "./components/ActionTabs"
import { Dashboard } from "./components/Dashboard"
import { SocialModal } from "./components/SocialModal"
import { SecurityDisclaimer } from "./components/SecurityDisclaimer"
import { AAVE_V3_BASE_TOKENS } from "./data/tokens"
import type { Token } from "./types"

function App() {
  const [showSocialModal, setShowSocialModal] = useState(false)
  const [socialModalData, setSocialModalData] = useState<{
    action: string
    amount: string
    token: string
  } | null>(null)
  const [selectedToken, setSelectedToken] = useState<Token>(AAVE_V3_BASE_TOKENS[0])

  // Build marker
  console.log(
    '[build]',
    import.meta?.env?.VITE_GIT_COMMIT || 'unknown-commit',
    new Date().toISOString()
  )

  // Call ready() when the interface is ready to be displayed
  // This follows the official Farcaster getting started guide
  useEffect(() => {
    const callReady = async () => {
      try {
        console.log("✅ App: Calling sdk.actions.ready() as per Farcaster docs")
        await sdk.actions.ready()
        console.log("✅ App: Farcaster SDK ready() called successfully - splash screen should hide")
      } catch (error) {
        console.warn("❌ App: Farcaster SDK ready() failed:", error)
        console.log("This might be expected in preview mode or if SDK is not available")
      }
    }

    callReady()
  }, [])

  const handleTransactionSuccess = (action: string, amount: string, token: string) => {
    setSocialModalData({ action, amount, token })
    setShowSocialModal(true)
  }

  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 p-4 space-y-6">
          <AssetSelector selectedToken={selectedToken} onTokenSelect={handleTokenSelect} />
          <ActionTabs onTransactionSuccess={handleTransactionSuccess} selectedToken={selectedToken} />
          <Dashboard />
          <SecurityDisclaimer />
        </main>
      </div>

      {showSocialModal && socialModalData && (
        <SocialModal
          isOpen={showSocialModal}
          onClose={() => setShowSocialModal(false)}
          action={socialModalData.action}
          amount={socialModalData.amount}
          token={socialModalData.token}
        />
      )}
    </div>
  )
}

export default App
