import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem'
import { baseSepolia } from 'viem/chains'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'
import { useEnrichedTokens } from './useAaveData'
import { getAuthenticatedAddress } from '../utils/farcaster'
import type { Token } from '../types'

// Create a public client for Base Sepolia with reliable RPC
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
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
      console.warn(`[balance] Contract ${tokenAddress} may not exist on Base Sepolia`)
    }
    return '0'
  }
}

// Fetch all token balances for a user using Farcaster wallet
async function fetchAllTokenBalances(farcasterWalletAddress: `0x${string}`, chainId?: string): Promise<Record<string, string>> {
  try {
    if (!farcasterWalletAddress) {
      console.warn('No Farcaster wallet address provided')
      return {}
    }

    // Only fetch balances for Base Sepolia chain (0x14a34 = 84532)
    if (chainId && chainId !== '0x14a34') {
      console.log('Skipping balance fetch for non-Base Sepolia chain:', chainId)
      return {}
    }

    console.log('Fetching token balances for Farcaster wallet:', farcasterWalletAddress)

          const balancePromises = AAVE_V3_BASE_TOKENS.map(async (token) => {
            try {
              console.log(`[balance] Attempting to fetch ${token.symbol} from ${token.address}`)
              const balance = await fetchTokenBalance(token.address, farcasterWalletAddress, token.decimals || 18)
              console.log(`[balance] ✅ ${token.symbol}: ${balance}`)
              return { address: token.address, balance }
            } catch (err: any) {
              if (String(err?.name || '').includes('ContractFunctionZeroDataError')) {
                // Skip token silently - contract doesn't exist
                console.warn(`[balance] ❌ Skipping token ${token.symbol} (${token.address}) - contract not found`)
                return null;
              }
              // Surface real errors
              console.error(`[balance] ❌ Error fetching ${token.symbol}:`, err)
              throw err;
            }
          })

    const results = await Promise.all(balancePromises)
    
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
    queryFn: () => fetchAllTokenBalances(farcasterWalletAddress!, chainId!),
    enabled: !!farcasterWalletAddress && !!chainId,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Prevent retry loops
    refetchOnWindowFocus: false, // Prevent refetch on focus
  })
}

// Hook to get enriched tokens with user balances
export function useTokensWithBalances(farcasterWalletAddress?: `0x${string}`, chainId?: string) {
  const { tokens, isLoading: aaveLoading, error: aaveError, isUsingFallbackData } = useEnrichedTokens()
  const { data: balances, isLoading: balanceLoading, error: balanceError } = useTokenBalances(farcasterWalletAddress, chainId)

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

