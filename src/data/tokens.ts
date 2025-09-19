import type { Token } from "../types"

// Base Sepolia testnet token addresses - confirmed working addresses
export const AAVE_V3_BASE_TOKENS: Token[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    icon: "💵",
    apy: "4.12%",
    balance: "0", // Will be populated with real wallet balance
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia (confirmed working)
    decimals: 6,
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    icon: "⟠",
    apy: "3.24%",
    balance: "0",
    address: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia (confirmed working)
    decimals: 18,
  },
  // Let's test the tokens you mentioned having
  {
    symbol: "EURC",
    name: "Euro Coin",
    icon: "💶",
    apy: "3.95%",
    balance: "0",
    address: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42", // EURC on Base Sepolia
    decimals: 6,
  },
  {
    symbol: "cbBTC",
    name: "Coinbase BTC",
    icon: "₿",
    apy: "2.89%",
    balance: "0",
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", // cbBTC on Base Sepolia
    decimals: 8,
  },
  // Removed USDT since it doesn't exist on Base Sepolia
]
