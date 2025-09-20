import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem'
import { base } from 'viem/chains'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'
import { useEnrichedTokens } from './useAaveData'
import { getAuthenticatedAddress } from '../utils/farcaster'
import type { Token } from '../types'

// Create a public client for Base mainnet with reliable RPC
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
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
    console.log(`[balance] Fetching balance for ${tokenAddress} (${decimals} decimals)`)
    
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress as `0x${string}`]
    })

    const formattedBalance = formatUnits(balance, decimals)
    console.log(`[balance] ${tokenAddress}: ${balance} raw -> ${formattedBalance} formatted`)
    return formattedBalance
  } catch (error) {
    console.warn(`[balance] Failed to fetch balance for token ${tokenAddress}:`, error)
    // Check if it's a "no data" error - this usually means the contract doesn't exist
    if (error.message?.includes('returned no data')) {
      console.warn(`[balance] Contract ${tokenAddress} may not exist on Base mainnet`)
    }
    return '0'
  }
}

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Fetch all token balances for a user using Farcaster wallet
async function fetchAllTokenBalances(farcasterWalletAddress: `0x${string}`, chainId?: string): Promise<Record<string, string>> {
  try {
    if (!farcasterWalletAddress) {
      console.warn('No Farcaster wallet address provided')
      return {}
    }

    // Only fetch balances for Base mainnet chain (0x2105 = 8453)
    if (chainId && chainId !== '0x2105') {
      console.log('Skipping balance fetch for non-Base mainnet chain:', chainId)
      return {}
    }

    console.log('Fetching token balances for Farcaster wallet:', farcasterWalletAddress)

    // Process tokens sequentially with delays to avoid rate limiting
    const results: Array<{ address: string; balance: string } | null> = []
    
    for (let i = 0; i < AAVE_V3_BASE_TOKENS.length; i++) {
      const token = AAVE_V3_BASE_TOKENS[i]
      
      try {
        console.log(`[balance] Attempting to fetch ${token.symbol} from ${token.address}`)
        const balance = await fetchTokenBalance(token.address, farcasterWalletAddress, token.decimals || 18)
        console.log(`[balance] ✅ ${token.symbol}: ${balance}`)
        results.push({ address: token.address, balance })
      } catch (err: any) {
        if (String(err?.name || '').includes('ContractFunctionZeroDataError')) {
          // Skip token silently - contract doesn't exist
          console.warn(`[balance] ❌ Skipping token ${token.symbol} (${token.address}) - contract not found`)
          results.push(null)
        } else if (err.message?.includes('429') || err.message?.includes('rate limit')) {
          // Handle rate limiting gracefully
          console.warn(`[balance] ⚠️ Rate limited for ${token.symbol}, using 0 balance`)
          results.push({ address: token.address, balance: '0' })
        } else {
          // Surface real errors
          console.error(`[balance] ❌ Error fetching ${token.symbol}:`, err)
          results.push({ address: token.address, balance: '0' })
        }
      }
      
             // Add delay between requests to avoid rate limiting (except for last token)
             if (i < AAVE_V3_BASE_TOKENS.length - 1) {
               // Much longer delays to avoid rate limiting
               const delayMs = i >= 2 ? 2000 : 1000
               await delay(delayMs)
             }
    }
    
    return results
      .filter((result): result is { address: string; balance: string } => result !== null)
      .reduce((acc, { address, balance }) => {
        acc[address.toLowerCase()] = balance
        return acc
      }, {} as Record<string, string>)
  } catch (error) {
    console.error('Error fetching token balances:', error)
    return {}
  }
}

// Hook to get user token balances using Farcaster wallet
export function useTokenBalances(farcasterWalletAddress?: `0x${string}`, chainId?: string) {
  return useQuery({
    queryKey: ['token-balances', 'farcaster', farcasterWalletAddress, chainId],
    queryFn: () => {
      console.log('[balance-query] Fetching balances for:', farcasterWalletAddress)
      return fetchAllTokenBalances(farcasterWalletAddress!, chainId!)
    },
    enabled: !!farcasterWalletAddress && !!chainId,
           staleTime: 120000, // 2 minutes - longer cache time
           refetchInterval: 300000, // Refetch every 5 minutes - much less frequent to avoid rate limits
    retry: false, // Prevent retry loops
    refetchOnWindowFocus: false, // Prevent refetch on focus
  })
}

// Hook to get enriched tokens with user balances
export function useTokensWithBalances(farcasterWalletAddress?: `0x${string}`, chainId?: string) {
  const { tokens, isLoading: aaveLoading, error: aaveError, isUsingFallbackData } = useEnrichedTokens()
  const { data: balances, isLoading: balanceLoading, error: balanceError } = useTokenBalances(farcasterWalletAddress, chainId)

  const enrichedTokens: Token[] = tokens.map(token => {
    // Use balance data if available, otherwise show 0
    const userBalance = balances?.[token.address.toLowerCase()] || '0'
    const userBalanceFormatted = userBalance === '0' 
      ? '0' 
      : parseFloat(userBalance).toFixed(7)

    // Debug logging for balance changes
    if (userBalance !== '0') {
      console.log(`[balance-display] ${token.symbol}: ${userBalance} -> ${userBalanceFormatted}`)
    }

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

