import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'
import type { Token } from '../types'

// Try multiple Aave data sources - Base subgraph appears to be down
const AAVE_DATA_SOURCES = [
  {
    name: 'Aave V3 The Graph (Ethereum)',
    url: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3',
    query: `
      query GetReserveData($reserveAddresses: [String!]!) {
        reserves(where: { underlyingAsset_in: $reserveAddresses, isActive: true }) {
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
        }
      }
    `,
    variables: () => ({ reserveAddresses: AAVE_V3_BASE_TOKENS.map(token => token.address.toLowerCase()) })
  },
  {
    name: 'Aave V3 The Graph (Polygon)',
    url: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-polygon',
    query: `
      query GetReserveData($reserveAddresses: [String!]!) {
        reserves(where: { underlyingAsset_in: $reserveAddresses, isActive: true }) {
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
        }
      }
    `,
    variables: () => ({ reserveAddresses: AAVE_V3_BASE_TOKENS.map(token => token.address.toLowerCase()) })
  }
]

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

// Realistic mock data based on typical Aave V3 rates
const MOCK_RESERVE_DATA: ReserveData[] = AAVE_V3_BASE_TOKENS.map(token => {
  // More realistic APY ranges based on typical Aave V3 rates
  const baseSupplyAPY = token.symbol === 'USDC' ? 0.04 : token.symbol === 'ETH' ? 0.03 : 0.025
  const baseBorrowAPY = token.symbol === 'USDC' ? 0.06 : token.symbol === 'ETH' ? 0.05 : 0.045
  
  const supplyAPY = baseSupplyAPY + (Math.random() - 0.5) * 0.01 // ±0.5% variation
  const borrowAPY = baseBorrowAPY + (Math.random() - 0.5) * 0.01 // ±0.5% variation
  
  return {
    id: token.address,
    underlyingAsset: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: 18,
    liquidityRate: (supplyAPY * 1e25).toString(), // Convert to ray (27 decimals)
    variableBorrowRate: (borrowAPY * 1e25).toString(), // Convert to ray (27 decimals)
    totalLiquidity: '1000000000000000000000000', // 1M tokens
    totalCurrentVariableDebt: '500000000000000000000000', // 500K tokens
    priceInEth: '1',
    priceInUsd: '2000'
  }
})

// Fetch Aave V3 reserve data with fallback
async function fetchAaveReserveData(): Promise<ReserveData[]> {
  // Try each data source
  for (const source of AAVE_DATA_SOURCES) {
    try {
      console.log(`Trying ${source.name}...`)
      
      const variables = typeof source.variables === 'function' 
        ? source.variables() 
        : source.variables

      const response = await fetch(source.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: source.query,
          variables
        })
      })

      if (response.ok) {
        const data: { data: AaveReserveData } = await response.json()
        if (data.data?.reserves?.length > 0) {
          console.log(`Successfully fetched data from ${source.name}`)
          
          // For any data source, filter to our tokens and use as reference
          const ourTokenAddresses = AAVE_V3_BASE_TOKENS.map(token => token.address.toLowerCase())
          const filteredReserves = data.data.reserves.filter(reserve => 
            ourTokenAddresses.includes(reserve.underlyingAsset.toLowerCase())
          )
          
          // If we found matching tokens, return them
          if (filteredReserves.length > 0) {
            return filteredReserves
          }
          
          // If no exact matches, return all reserves as reference data
          return data.data.reserves
        }
      }
      
      console.warn(`${source.name} returned no data`)
    } catch (error) {
      console.warn(`Failed to fetch from ${source.name}:`, error)
      continue
    }
  }
  
  // If all sources fail, throw an error to trigger fallback
  console.warn('All Aave data sources failed')
  throw new Error('Aave data sources unavailable - using demo data')
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
