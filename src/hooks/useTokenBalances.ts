import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem'
import { base } from 'viem/chains'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'
import { useEnrichedTokens } from './useAaveData'
import type { Token } from '../types'

// Create a public client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

// ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Fetch token balance for a specific token
async function fetchTokenBalance(
  tokenAddress: string,
  userAddress: string,
  decimals: number = 18
): Promise<string> {
  try {
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress as `0x${string}`]
    })

    return formatUnits(balance, decimals)
  } catch (error) {
    console.warn(`Failed to fetch balance for token ${tokenAddress}:`, error)
    return '0'
  }
}

// Fetch all token balances for a user
async function fetchAllTokenBalances(userAddress: string): Promise<Record<string, string>> {
  const balancePromises = AAVE_V3_BASE_TOKENS.map(async (token) => {
    const balance = await fetchTokenBalance(token.address, userAddress, token.decimals || 18)
    return { address: token.address, balance }
  })

  const results = await Promise.all(balancePromises)
  
  return results.reduce((acc, { address, balance }) => {
    acc[address.toLowerCase()] = balance
    return acc
  }, {} as Record<string, string>)
}

// Hook to get user token balances
export function useTokenBalances() {
  const { address, isConnected } = useAccount()

  return useQuery({
    queryKey: ['token-balances', address],
    queryFn: () => fetchAllTokenBalances(address!),
    enabled: !!address && isConnected,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2,
  })
}

// Hook to get enriched tokens with user balances
export function useTokensWithBalances() {
  const { tokens, isLoading: aaveLoading, error: aaveError, isUsingFallbackData } = useEnrichedTokens()
  const { data: balances, isLoading: balanceLoading, error: balanceError } = useTokenBalances()
  const { address, isConnected } = useAccount()

  const enrichedTokens: Token[] = tokens.map(token => {
    const userBalance = balances?.[token.address.toLowerCase()] || '0'
    const userBalanceFormatted = userBalance === '0' 
      ? '0' 
      : parseFloat(userBalance).toFixed(4)

    return {
      ...token,
      userBalance,
      userBalanceFormatted,
      balance: isConnected && userBalance !== '0' 
        ? `${userBalanceFormatted} ${token.symbol}`
        : token.balance // Fallback to mock data if not connected
    }
  })

  return {
    tokens: enrichedTokens,
    isLoading: aaveLoading || balanceLoading,
    error: aaveError || balanceError,
    isConnected,
    isUsingFallbackData
  }
}

