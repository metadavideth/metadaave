import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'

// Aave V3 Pool ABI for user positions
// Note: getUserReserveData might not exist on the Pool contract
// We'll use getUserAccountData instead and return empty positions for now
const AAVE_POOL_ABI = [
  {
    "inputs": [
      {"name": "user", "type": "address"}
    ],
    "name": "getUserAccountData",
    "outputs": [
      {"name": "totalCollateralETH", "type": "uint256"},
      {"name": "totalDebtETH", "type": "uint256"},
      {"name": "availableBorrowsETH", "type": "uint256"},
      {"name": "currentLiquidationThreshold", "type": "uint256"},
      {"name": "ltv", "type": "uint256"},
      {"name": "healthFactor", "type": "uint256"}
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
    
    // For now, we'll return empty positions for all tokens
    // Getting individual token positions from Aave V3 requires more complex logic
    // that involves querying multiple contracts and calculating scaled amounts
    const positions: UserPosition[] = AAVE_V3_BASE_TOKENS.map(token => ({
      tokenAddress: token.address,
      symbol: token.symbol,
      suppliedAmount: "0",
      borrowedAmount: "0",
      availableToBorrow: "0",
      availableToWithdraw: "0",
      availableToRepay: "0"
    }))
    
    console.log('[positions] Returning empty positions for all tokens (simplified implementation)')
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
    staleTime: 120000, // 2 minutes - longer cache time
    refetchInterval: 300000, // 5 minutes - much less frequent
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
