import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem'
import { baseSepolia } from 'viem/chains'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'
import { useEnrichedTokens } from './useAaveData'
import { getAuthenticatedAddress } from '../utils/farcaster'
import type { Token } from '../types'

// Create a public client for Base Sepolia
const publicClient = createPublicClient({
  chain: baseSepolia,
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

// Fetch all token balances for a user using Farcaster wallet
async function fetchAllTokenBalances(): Promise<Record<string, string>> {
  try {
    // Get the authenticated Farcaster wallet address
    const userAddress = await getAuthenticatedAddress()
    
    if (!userAddress) {
      console.warn('No authenticated Farcaster address found')
      return {}
    }

    console.log('Fetching token balances for Farcaster wallet:', userAddress)

    const balancePromises = AAVE_V3_BASE_TOKENS.map(async (token) => {
      const balance = await fetchTokenBalance(token.address, userAddress, token.decimals || 18)
      return { address: token.address, balance }
    })

    const results = await Promise.all(balancePromises)
    
    return results.reduce((acc, { address, balance }) => {
      acc[address.toLowerCase()] = balance
      return acc
    }, {} as Record<string, string>)
  } catch (error) {
    console.error('Error fetching token balances:', error)
    return {}
  }
}

// Hook to get user token balances using Farcaster wallet
export function useTokenBalances(farcasterWalletAddress?: `0x${string}`) {
  // Early-out when not connected
  if (!farcasterWalletAddress) {
    return { data: [], isLoading: false, error: null }
  }

  return useQuery({
    queryKey: ['token-balances', 'farcaster', farcasterWalletAddress],
    queryFn: fetchAllTokenBalances,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2,
  })
}

// Hook to get enriched tokens with user balances
export function useTokensWithBalances(farcasterWalletAddress?: `0x${string}`) {
  const { tokens, isLoading: aaveLoading, error: aaveError, isUsingFallbackData } = useEnrichedTokens()
  const { data: balances, isLoading: balanceLoading, error: balanceError } = useTokenBalances(farcasterWalletAddress)

  const enrichedTokens: Token[] = tokens.map(token => {
    const userBalance = balances?.[token.address.toLowerCase()] || '0'
    const userBalanceFormatted = userBalance === '0' 
      ? '0' 
      : parseFloat(userBalance).toFixed(4)

    return {
      ...token,
      userBalance,
      userBalanceFormatted,
      balance: userBalance !== '0' 
        ? `${userBalanceFormatted} ${token.symbol}`
        : '0' // No fallback to mock data
    }
  })

  // Check if we actually have real balances (not just mock data)
  const hasRealBalances = balances && Object.values(balances).some(balance => balance !== '0')
  const isConnected = hasRealBalances || (balances && Object.keys(balances).length > 0)

  return {
    tokens: enrichedTokens,
    isLoading: aaveLoading || balanceLoading,
    error: aaveError || balanceError,
    isConnected,
    isUsingFallbackData
  }
}

