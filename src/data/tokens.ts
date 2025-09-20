import type { Token } from "../types"

// Base mainnet token addresses from official Aave Address Book
// Source: https://github.com/bgd-labs/aave-address-book
export const AAVE_V3_BASE_TOKENS: Token[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    icon: "💵",
    apy: "4.12%",
    balance: "0", // Will be populated with real wallet balance
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Official USDC on Base mainnet
    decimals: 6,
  },
  {
    symbol: "USDbC",
    name: "USD Base Coin",
    icon: "💵",
    apy: "4.05%",
    balance: "0",
    address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // Official USDbC on Base mainnet
    decimals: 6,
  },
  {
    symbol: "cbBTC",
    name: "Coinbase Wrapped Bitcoin",
    icon: "₿",
    apy: "2.89%",
    balance: "0",
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", // Official cbBTC on Base mainnet
    decimals: 8,
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    icon: "⟠",
    apy: "3.24%",
    balance: "0",
    address: "0x4200000000000000000000000000000000000006", // Official WETH on Base mainnet
    decimals: 18,
  },
  {
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked ETH",
    icon: "⟠",
    apy: "3.15%",
    balance: "0",
    address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", // Official cbETH on Base mainnet
    decimals: 18,
  },
  {
    symbol: "EURC",
    name: "Euro Coin",
    icon: "€",
    apy: "2.95%",
    balance: "0",
    address: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42", // Official EURC on Base mainnet
    decimals: 6,
  },
  {
    symbol: "tBTC",
    name: "Threshold Bitcoin",
    icon: "₿",
    apy: "1.85%",
    balance: "0",
    address: "0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b", // Official tBTC on Base mainnet
    decimals: 18,
  },
  {
    symbol: "GHO",
    name: "Aave GHO",
    icon: "👻",
    apy: "3.50%",
    balance: "0",
    address: "0x6Bb7a212910682DCFdbd5BCBb3e28FB4E8da10Ee", // Official GHO on Base mainnet
    decimals: 18,
  },
]
