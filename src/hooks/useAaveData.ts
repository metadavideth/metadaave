import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'
import type { Token } from '../types'

// Aave V3 official API endpoint
const AAVE_V3_API_URL = 'https://api.v3.aave.com/graphql'

// GraphQL query to get reserve data for Base from Aave V3 API
const GET_RESERVE_DATA = `
  query GetReserveData($chainId: Int!) {
    reserves(chainId: $chainId) {
      id
      underlyingAsset
      symbol
      name
      decimals
      liquidityRate
      variableBorrowRate
      totalLiquidity
      totalCurrentVariableDebt
      priceInEth
      priceInUsd
      isActive
    }
  }
`

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
}

interface AaveReserveData {
  reserves: ReserveData[]
}

// Mock data for fallback when subgraph fails
const MOCK_RESERVE_DATA: ReserveData[] = AAVE_V3_BASE_TOKENS.map(token => ({
  id: token.address,
  underlyingAsset: token.address,
  symbol: token.symbol,
  name: token.name,
  decimals: 18,
  liquidityRate: (Math.random() * 0.05 * 1e25).toString(), // Random APY between 0-5%
  variableBorrowRate: (Math.random() * 0.08 * 1e25).toString(), // Random borrow rate between 0-8%
  totalLiquidity: '1000000000000000000000000', // 1M tokens
  totalCurrentVariableDebt: '500000000000000000000000', // 500K tokens
  priceInEth: '1',
  priceInUsd: '2000'
}))

// Fetch Aave V3 reserve data with fallback
async function fetchAaveReserveData(): Promise<ReserveData[]> {
  try {
    console.log('Fetching Aave V3 data from official API...')
    const response = await fetch(AAVE_V3_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GET_RESERVE_DATA,
        variables: { chainId: 8453 } // Base chain ID
      })
    })

    if (response.ok) {
      const data: { data: AaveReserveData } = await response.json()
      if (data.data?.reserves?.length > 0) {
        console.log('Successfully fetched data from Aave V3 API')
        // Filter to only include our tokens
        const ourTokenAddresses = AAVE_V3_BASE_TOKENS.map(token => token.address.toLowerCase())
        const filteredReserves = data.data.reserves.filter(reserve => 
          ourTokenAddresses.includes(reserve.underlyingAsset.toLowerCase())
        )
        return filteredReserves
      }
    }
    
    throw new Error(`API response not ok: ${response.status}`)
  } catch (error) {
    console.warn('Failed to fetch from Aave V3 API:', error)
    throw new Error('Aave V3 API unavailable - using demo data')
  }
}

// Hook to get Aave V3 data
export function useAaveData() {
  return useQuery({
    queryKey: ['aave-data'],
    queryFn: fetchAaveReserveData,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
    meta: {
      isFallbackData: false // This will be set to true when using mock data
    }
  })
}

// Hook to get enriched token data with Aave APYs
export function useEnrichedTokens() {
  const { data: aaveData, isLoading, error } = useAaveData()

  // Use fallback data when there's an error
  const dataToUse = error ? MOCK_RESERVE_DATA : aaveData

  const enrichedTokens: Token[] = AAVE_V3_BASE_TOKENS.map(token => {
    const reserveData = dataToUse?.find(
      reserve => reserve.underlyingAsset.toLowerCase() === token.address.toLowerCase()
    )

    if (reserveData) {
      // Convert rates from ray (27 decimals) to percentage
      const supplyAPY = (Number(reserveData.liquidityRate) / 1e25) * 100
      const borrowAPY = (Number(reserveData.variableBorrowRate) / 1e25) * 100

      return {
        ...token,
        supplyAPY,
        borrowAPY,
        decimals: reserveData.decimals,
        apy: `${supplyAPY.toFixed(2)}%`, // Update the display APY
      }
    }

    return token
  })

  return {
    tokens: enrichedTokens,
    isLoading,
    error,
    isUsingFallbackData: !!error
  }
}
