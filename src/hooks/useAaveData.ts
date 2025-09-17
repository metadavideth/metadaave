import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'
import type { Token } from '../types'

// Aave V3 Base subgraph endpoint
const AAVE_V3_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3'

// GraphQL query to get reserve data for Base
const GET_RESERVE_DATA = `
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

// Fetch Aave V3 reserve data
async function fetchAaveReserveData(): Promise<ReserveData[]> {
  const reserveAddresses = AAVE_V3_BASE_TOKENS.map(token => token.address.toLowerCase())
  
  const response = await fetch(AAVE_V3_SUBGRAPH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: GET_RESERVE_DATA,
      variables: { reserveAddresses }
    })
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Aave data')
  }

  const data: { data: AaveReserveData } = await response.json()
  return data.data.reserves
}

// Hook to get Aave V3 data
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
    error
  }
}
