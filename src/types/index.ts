export interface Token {
  symbol: string
  name: string
  icon: string
  apy: string
  balance: string
  address: string
  // Real-time data fields
  supplyAPY?: number
  borrowAPY?: number
  userBalance?: string
  userBalanceFormatted?: string
  decimals?: number
}

export interface WalletData {
  balance: string
  totalSupplied: string
  totalBorrowed: string
  healthFactor: number
}

export interface TransactionData {
  action: "supply" | "borrow" | "repay" | "withdraw"
  token: string
  amount: string
  fee: string
}
