import type { Token } from "../types"

// Base Sepolia testnet token addresses - confirmed working addresses only
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
  // Note: EURC and cbBTC contracts don't exist on Base Sepolia with the addresses we tested
  // If you have these tokens, they might be on a different network or need different addresses
  // You can check Base Sepolia block explorer: https://base-sepolia.blockscout.com/
]
