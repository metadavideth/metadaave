import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'
import type { Token } from '../types'

interface ReserveData {
  id: string
  underlyingAsset: string
  symbol: string
  name: string
  decimals: number
  liquidityRate: string
  variableBorrowRate: string
  totalLiquidity: string
  totalCurrentVariableDebt: string
  priceInEth: string
  priceInUsd: string
  isActive: boolean
  supplyAPY: number
  borrowAPY: number
  isUsingFallbackData: boolean
}

interface AaveApiResponse {
  success: boolean
  data: ReserveData[]
  isUsingFallbackData: boolean
  timestamp: string
}

// Fetch Aave V3 data from our Vercel API endpoint
async function fetchAaveReserveData(): Promise<ReserveData[]> {
  const response = await fetch('/api/aave')
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  
  const result: AaveApiResponse = await response.json()
  
  if (!result.success) {
    throw new Error('API returned error')
  }
  
  return result.data
}

// Hook to get Aave V3 data from API
export function useAaveData() {
  return useQuery({
    queryKey: ['aave-data'],
    queryFn: fetchAaveReserveData,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
  })
}

// Hook to get enriched token data with Aave APYs
export function useEnrichedTokens() {
  const { data: aaveData, isLoading, error } = useAaveData()

  const enrichedTokens: Token[] = AAVE_V3_BASE_TOKENS.map(token => {
    const reserveData = aaveData?.find(
      reserve => reserve.underlyingAsset.toLowerCase() === token.address.toLowerCase()
    )

    if (reserveData) {
      return {
        ...token,
        supplyAPY: reserveData.supplyAPY,
        borrowAPY: reserveData.borrowAPY,
        decimals: reserveData.decimals,
        apy: `${reserveData.supplyAPY.toFixed(2)}%`,
      }
    }

    return token
  })

  return {
    tokens: enrichedTokens,
    isLoading,
    error,
    isUsingFallbackData: aaveData?.[0]?.isUsingFallbackData || false
  }
}