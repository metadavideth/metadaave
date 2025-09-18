import type { Token } from "../types"

// Base Sepolia testnet token addresses
export const AAVE_V3_BASE_TOKENS: Token[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    icon: "⟠",
    apy: "3.24%",
    balance: "2.45 ETH",
    address: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    icon: "💵",
    apy: "4.12%",
    balance: "1,250.00 USDC",
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
  },
  {
    symbol: "cbBTC",
    name: "Coinbase BTC",
    icon: "₿",
    apy: "2.89%",
    balance: "0.15 cbBTC",
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", // cbBTC on Base Sepolia
  },
  {
    symbol: "weETH",
    name: "Wrapped eETH",
    icon: "🔷",
    apy: "3.67%",
    balance: "5.20 weETH",
    address: "0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A", // weETH on Base Sepolia
  },
  {
    symbol: "wstETH",
    name: "Wrapped stETH",
    icon: "🟦",
    apy: "3.45%",
    balance: "1.80 wstETH",
    address: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452", // wstETH on Base Sepolia
  },
  {
    symbol: "cbETH",
    name: "Coinbase ETH",
    icon: "🔵",
    apy: "3.18%",
    balance: "0.95 cbETH",
    address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", // cbETH on Base Sepolia
  },
  {
    symbol: "EURC",
    name: "Euro Coin",
    icon: "💶",
    apy: "3.95%",
    balance: "850.00 EURC",
    address: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
  },
  {
    symbol: "GHO",
    name: "GHO Stablecoin",
    icon: "👻",
    apy: "4.25%",
    balance: "500.00 GHO",
    address: "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f",
  },
  {
    symbol: "USDbC",
    name: "USD Base Coin",
    icon: "🪙",
    apy: "4.08%",
    balance: "750.00 USDbC",
    address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
  },
  {
    symbol: "tBTC",
    name: "Threshold BTC",
    icon: "🟠",
    apy: "2.95%",
    balance: "0.08 tBTC",
    address: "0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b",
  },
]
