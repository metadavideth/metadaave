import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { WagmiProvider, createConfig, http } from "wagmi"
import { base } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  ssr: false,
})

const queryClient = new QueryClient()

// Initialize Farcaster SDK when available
function initializeFarcasterSDK() {
  if (typeof window !== 'undefined' && (window as any).FarcasterMiniApp) {
    const sdk = (window as any).FarcasterMiniApp
    console.log("Farcaster SDK loaded:", sdk)
    
    // Initialize the SDK
    if (sdk.actions && sdk.actions.ready) {
      sdk.actions.ready()
        .then(() => {
          console.log("Farcaster SDK initialized successfully")
        })
        .catch((error: any) => {
          console.warn("Farcaster SDK initialization failed:", error)
        })
    }
  } else {
    // Retry after a short delay
    setTimeout(initializeFarcasterSDK, 100)
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
