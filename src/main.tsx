import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { WagmiProvider, createConfig, http } from "wagmi"
import { base } from "wagmi/chains"
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    miniAppConnector()
  ],
  ssr: false,
})

const queryClient = new QueryClient()

// Note: ready() is now called in App.tsx useEffect as per Farcaster docs
// This ensures it's called when the React component is ready

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
