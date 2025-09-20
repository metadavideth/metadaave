import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'

// Aave V3 Pool ABI for user positions
const AAVE_POOL_ABI = [
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "reserve", "type": "address"}
    ],
    "name": "getUserReserveData",
    "outputs": [
      {"name": "underlyingAsset", "type": "address"},
      {"name": "scaledATokenBalance", "type": "uint256"},
      {"name": "usageAsCollateralEnabledOnUser", "type": "bool"},
      {"name": "scaledVariableDebt", "type": "uint256"},
      {"name": "scaledStableDebt", "type": "uint256"},
      {"name": "principalStableDebt", "type": "uint256"},
      {"name": "stableBorrowRate", "type": "uint256"},
      {"name": "liquidityRate", "type": "uint256"},
      {"name": "stableRateLastUpdated", "type": "uint256"},
      {"name": "variableBorrowIndex", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// Aave V3 Pool address on Base mainnet
const AAVE_POOL_ADDRESS = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5'

// Create public client for Base mainnet
const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

interface UserPosition {
  tokenAddress: string
  symbol: string
  suppliedAmount: string
  borrowedAmount: string
  availableToBorrow: string
  availableToWithdraw: string
  availableToRepay: string
}

// Fetch user positions for all tokens
async function fetchUserPositions(userAddress: `0x${string}`): Promise<UserPosition[]> {
  try {
    console.log('[positions] Fetching user positions for:', userAddress)
    
    const positions: UserPosition[] = []
    
    for (const token of AAVE_V3_BASE_TOKENS) {
      try {
        console.log(`[positions] Fetching position for ${token.symbol}`)
        
        const positionData = await publicClient.readContract({
          address: AAVE_POOL_ADDRESS,
          abi: AAVE_POOL_ABI,
          functionName: 'getUserReserveData',
          args: [userAddress, token.address as `0x${string}`]
        })
        
        // Convert scaled amounts to actual amounts
        const suppliedAmount = formatUnits(positionData[1], token.decimals || 18) // scaledATokenBalance
        const borrowedAmount = formatUnits(positionData[3], token.decimals || 18) // scaledVariableDebt
        
        // For now, we'll calculate available amounts based on basic logic
        // In a real implementation, you'd need to get more complex data from Aave
        const availableToWithdraw = suppliedAmount
        const availableToRepay = borrowedAmount
        const availableToBorrow = "0" // This would need to be calculated from collateral and health factor
        
        positions.push({
          tokenAddress: token.address,
          symbol: token.symbol,
          suppliedAmount,
          borrowedAmount,
          availableToBorrow,
          availableToWithdraw,
          availableToRepay
        })
        
        console.log(`[positions] ${token.symbol}: supplied=${suppliedAmount}, borrowed=${borrowedAmount}`)
        
      } catch (error) {
        console.warn(`[positions] Failed to fetch position for ${token.symbol}:`, error)
        // Add empty position for this token
        positions.push({
          tokenAddress: token.address,
          symbol: token.symbol,
          suppliedAmount: "0",
          borrowedAmount: "0",
          availableToBorrow: "0",
          availableToWithdraw: "0",
          availableToRepay: "0"
        })
      }
    }
    
    return positions
  } catch (error) {
    console.error('[positions] Error fetching user positions:', error)
    return []
  }
}

// Hook to get user positions
export function useUserPositions() {
  const { address } = useAccount()
  
  return useQuery({
    queryKey: ['user-positions', address],
    queryFn: () => fetchUserPositions(address!),
    enabled: !!address,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    retry: false,
    refetchOnWindowFocus: false,
  })
}

// Helper to get position for a specific token
export function useTokenPosition(tokenAddress: string) {
  const { data: positions, isLoading, error } = useUserPositions()
  
  const position = positions?.find(p => p.tokenAddress.toLowerCase() === tokenAddress.toLowerCase())
  
  return {
    position,
    isLoading,
    error
  }
}
