import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { WagmiProvider, createConfig, http } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const config = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: false,
})

const queryClient = new QueryClient()

// Initialize Farcaster SDK when available
function initializeFarcasterSDK() {
  if (typeof window !== 'undefined' && (window as any).FarcasterMiniApp) {
    const sdk = (window as any).FarcasterMiniApp
    console.log("Farcaster SDK loaded:", sdk)

    // Call ready() to hide the splash screen when interface is ready
    if (sdk.actions && sdk.actions.ready) {
      sdk.actions.ready()
        .then(() => {
          console.log("✅ Farcaster SDK ready() called - splash screen should hide")
        })
        .catch((error: any) => {
          console.warn("❌ Farcaster SDK ready() failed:", error)
        })
    }
  } else {
    // In preview mode, SDK is not available so we can't call ready()
    // This means the splash screen will persist - this is expected behavior
    console.log("⚠️ Farcaster SDK not available - splash screen will persist in preview mode")
  }
}

// Start initialization
initializeFarcasterSDK()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
