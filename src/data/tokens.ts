import type { Token } from "../types"

// Base Sepolia testnet token addresses from official Aave Address Book
// Source: https://github.com/bgd-labs/aave-address-book
export const AAVE_V3_BASE_TOKENS: Token[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    icon: "💵",
    apy: "4.12%",
    balance: "0", // Will be populated with real wallet balance
    address: "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f", // Official USDC on Base Sepolia
    decimals: 6,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    icon: "💵",
    apy: "4.05%",
    balance: "0",
    address: "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a", // Official USDT on Base Sepolia
    decimals: 6,
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    icon: "₿",
    apy: "2.89%",
    balance: "0",
    address: "0x54114591963CF60EF3aA63bEfD6eC263D98145a4", // Official WBTC on Base Sepolia
    decimals: 8,
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    icon: "⟠",
    apy: "3.24%",
    balance: "0",
    address: "0x4200000000000000000000000000000000000006", // Official WETH on Base Sepolia
    decimals: 18,
  },
  {
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked ETH",
    icon: "⟠",
    apy: "3.15%",
    balance: "0",
    address: "0xD171b9694f7A2597Ed006D41f7509aaD4B485c4B", // Official cbETH on Base Sepolia
    decimals: 18,
  },
  {
    symbol: "LINK",
    name: "Chainlink Token",
    icon: "🔗",
    apy: "2.95%",
    balance: "0",
    address: "0x810D46F9a9027E28F9B01F75E2bdde839dA61115", // Official LINK on Base Sepolia
    decimals: 18,
  },
]
