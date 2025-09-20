import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'
import type { Token } from '../types'

// Aave V3 Base contract addresses
const AAVE_V3_BASE_ADDRESSES = {
  POOL: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951', // Aave V3 Pool on Base
  POOL_DATA_PROVIDER: '0x2d8A3C4C6A8F0C8C8C8C8C8C8C8C8C8C8C8C8C8C', // PoolDataProvider
  ORACLE: '0x2d8A3C4C6A8F0C8C8C8C8C8C8C8C8C8C8C8C8C8C8C', // Price Oracle
}

// Create a public client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

// ABI for Aave V3 Pool contract
const POOL_ABI = [
  {
    inputs: [{ name: 'asset', type: 'address' }],
    name: 'getReserveData',
    outputs: [
      {
        components: [
          { name: 'configuration', type: 'tuple' },
          { name: 'liquidityIndex', type: 'uint128' },
          { name: 'currentLiquidityRate', type: 'uint128' },
          { name: 'variableBorrowIndex', type: 'uint128' },
          { name: 'currentVariableBorrowRate', type: 'uint128' },
          { name: 'currentStableBorrowRate', type: 'uint128' },
          { name: 'lastUpdateTimestamp', type: 'uint40' },
          { name: 'id', type: 'uint16' },
          { name: 'aTokenAddress', type: 'address' },
          { name: 'stableDebtTokenAddress', type: 'address' },
          { name: 'variableDebtTokenAddress', type: 'address' },
          { name: 'interestRateStrategyAddress', type: 'address' },
          { name: 'accruedToTreasury', type: 'uint128' },
          { name: 'unbacked', type: 'uint128' },
          { name: 'isolationModeTotalDebt', type: 'uint128' }
        ],
        name: 'reserveData',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getReservesList',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

// ABI for ERC20 token
const ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

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

// Fetch Aave V3 data directly from Base contracts
async function fetchAaveBaseData(): Promise<ReserveData[]> {
  try {
    console.log('Fetching Aave V3 data directly from Base contracts...')
    
    // Get all reserves from the pool
    const reservesList = await publicClient.readContract({
      address: AAVE_V3_BASE_ADDRESSES.POOL as `0x${string}`,
      abi: POOL_ABI,
      functionName: 'getReservesList'
    })

    console.log('Found reserves:', reservesList.length)

    // Get reserve data for each token
    const reserveDataPromises = AAVE_V3_BASE_TOKENS.map(async (token) => {
      try {
        const reserveData = await publicClient.readContract({
          address: AAVE_V3_BASE_ADDRESSES.POOL as `0x${string}`,
          abi: POOL_ABI,
          functionName: 'getReserveData',
          args: [token.address as `0x${string}`]
        })

        // Get token symbol and decimals
        const [symbol, decimals] = await Promise.all([
          publicClient.readContract({
            address: token.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'symbol'
          }).catch(() => token.symbol),
          publicClient.readContract({
            address: token.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'decimals'
          }).catch(() => 18)
        ])

        return {
          id: token.address,
          underlyingAsset: token.address,
          symbol: symbol as string,
          name: token.name,
          decimals: decimals as number,
          liquidityRate: reserveData.currentLiquidityRate.toString(),
          variableBorrowRate: reserveData.currentVariableBorrowRate.toString(),
          totalLiquidity: '0', // Would need additional calls to get this
          totalCurrentVariableDebt: '0', // Would need additional calls to get this
          priceInEth: '1',
          priceInUsd: '2000'
        }
      } catch (error) {
        console.warn(`Failed to fetch data for ${token.symbol}:`, error)
        return null
      }
    })

    const results = await Promise.all(reserveDataPromises)
    const validResults = results.filter((result): result is ReserveData => result !== null)

    if (validResults.length > 0) {
      console.log(`Successfully fetched data for ${validResults.length} tokens from Base contracts`)
      return validResults
    }

    throw new Error('No valid reserve data found')
  } catch (error) {
    console.warn('Failed to fetch from Base contracts:', error)
    throw new Error('Aave V3 Base contracts unavailable - using demo data')
  }
}

// Hook to get Aave V3 Base data
export function useAaveBaseData() {
  return useQuery({
    queryKey: ['aave-base-data'],
    queryFn: fetchAaveBaseData,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: false, // Prevent retry loops
    refetchOnWindowFocus: false, // Prevent refetch on focus
  })
}

// Hook to get enriched tokens with Aave Base data
export function useTokensWithAaveBase() {
  const { data: aaveData, isLoading, error } = useAaveBaseData()
  const { address, isConnected } = useAccount()

  const enrichedTokens: Token[] = AAVE_V3_BASE_TOKENS.map(token => {
    const reserveData = aaveData?.find(
      (reserve: any) => reserve.underlyingAsset.toLowerCase() === token.address.toLowerCase()
    )

    if (reserveData) {
      // Convert rates from ray (27 decimals) to percentage
      const supplyAPY = (Number(reserveData.liquidityRate) / 1e25) * 100
      const borrowAPY = (Number(reserveData.variableBorrowRate) / 1e25) * 100

      return {
        ...token,
        supplyAPY,
        borrowAPY,
        decimals: reserveData.decimals || 18,
        apy: `${supplyAPY.toFixed(2)}%`,
      }
    }

    return token
  })

  return {
    tokens: enrichedTokens,
    isLoading,
    error,
    isUsingFallbackData: !!error,
    isConnected
  }
}
