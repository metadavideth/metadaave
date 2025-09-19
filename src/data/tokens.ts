import type { Token } from "../types"

// Base Sepolia testnet token addresses - testing with known working addresses
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
  // Let's test with a few more addresses to see which ones work
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    icon: "⟠",
    apy: "3.24%",
    balance: "0",
    address: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia
    decimals: 18,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    icon: "💵",
    apy: "4.05%",
    balance: "0",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDT on Base Sepolia
    decimals: 6,
  },
  // Temporarily commenting out tokens that might not exist
  // {
  //   symbol: "cbBTC",
  //   name: "Coinbase BTC",
  //   icon: "₿",
  //   apy: "2.89%",
  //   balance: "0",
  //   address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  //   decimals: 8,
  // },
  // {
  //   symbol: "EURC",
  //   name: "Euro Coin",
  //   icon: "💶",
  //   apy: "3.95%",
  //   balance: "0",
  //   address: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
  //   decimals: 6,
  // },
]
