"use client"

import { useState, useEffect } from "react"
// SDK should be injected by Farcaster, not imported as a module
import { Header } from "./components/Header"
import { AssetSelector } from "./components/AssetSelector"
import { ActionTabs } from "./components/ActionTabs"
import { Dashboard } from "./components/Dashboard"
import { SocialModal } from "./components/SocialModal"
import { SecurityDisclaimer } from "./components/SecurityDisclaimer"
import { AAVE_V3_BASE_TOKENS } from "./data/tokens"
import type { Token } from "./types"
import { waitForFarcasterSDK } from "./utils/farcaster"

function App() {
  const [showSocialModal, setShowSocialModal] = useState(false)
  const [socialModalData, setSocialModalData] = useState<{
    action: string
    amount: string
    token: string
  } | null>(null)
  const [selectedToken, setSelectedToken] = useState<Token>(AAVE_V3_BASE_TOKENS[0])

  // Call ready() when the interface is ready to be displayed
  // This follows the official Farcaster getting started guide
  useEffect(() => {
    const callReady = async () => {
      try {
        // Try to call ready() immediately - don't wait for SDK injection
        // The SDK should be available on window.FarcasterMiniApp
        if ((window as any).FarcasterMiniApp && (window as any).FarcasterMiniApp.actions) {
          console.log("✅ App: Calling sdk.actions.ready() immediately")
          await (window as any).FarcasterMiniApp.actions.ready()
          console.log("✅ App: Farcaster SDK ready() called successfully - splash screen should hide")
        } else {
          console.log("❌ App: FarcasterMiniApp not available, trying to wait for SDK...")
          // Fallback: wait for SDK injection
          const sdk = await waitForFarcasterSDK()
          if (sdk && sdk.actions && sdk.actions.ready) {
            console.log("✅ App: Calling sdk.actions.ready() after waiting")
            await sdk.actions.ready()
            console.log("✅ App: Farcaster SDK ready() called successfully - splash screen should hide")
          } else {
            console.log("❌ App: SDK not available or ready() method not found")
          }
        }
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
