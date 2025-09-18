import { VercelRequest, VercelResponse } from '@vercel/node'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'

// Base network configuration
const BASE_CHAIN_ID = 8453
const BASE_RPC_URL = 'https://mainnet.base.org'

// Aave V3 Pool addresses on Base (from Aave Address Book)
const AAVE_V3_POOL_ADDRESS = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5'
const UI_POOL_DATA_PROVIDER_ADDRESS = '0x68100bD5345eA474D93577127C11F39FF8463e93'

// Token addresses on Base (from Aave Address Book)
const BASE_TOKEN_ADDRESSES = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  ETH: '0x4200000000000000000000000000000000000006', // WETH
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  USDT: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // Using DAI as placeholder
  WETH: '0x4200000000000000000000000000000000000006'
}

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
}

interface AaveReserveData {
  reserves: ReserveData[]
}

// Fallback mock data
const MOCK_RESERVE_DATA: ReserveData[] = [
  {
    id: BASE_TOKEN_ADDRESSES.USDC,
    underlyingAsset: BASE_TOKEN_ADDRESSES.USDC,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    liquidityRate: '40000000000000000000000000', // ~4% APY in ray
    variableBorrowRate: '60000000000000000000000000', // ~6% APY in ray
    totalLiquidity: '1000000000000', // 1M USDC
    totalCurrentVariableDebt: '500000000000', // 500K USDC
    priceInEth: '0.0005',
    priceInUsd: '1.00',
    isActive: true,
    supplyAPY: 4.0,
    borrowAPY: 6.0,
    isUsingFallbackData: true
  },
  {
    id: BASE_TOKEN_ADDRESSES.ETH,
    underlyingAsset: BASE_TOKEN_ADDRESSES.ETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    liquidityRate: '30000000000000000000000000', // ~3% APY in ray
    variableBorrowRate: '50000000000000000000000000', // ~5% APY in ray
    totalLiquidity: '1000000000000000000000', // 1000 ETH
    totalCurrentVariableDebt: '500000000000000000000', // 500 ETH
    priceInEth: '1.0',
    priceInUsd: '2000.00',
    isActive: true,
    supplyAPY: 3.0,
    borrowAPY: 5.0,
    isUsingFallbackData: true
  }
]

// Aave V3 Pool ABI - minimal for getReserveData
const AAVE_V3_POOL_ABI = [
  {
    inputs: [{ name: 'asset', type: 'address' }],
    name: 'getReserveData',
    outputs: [
      { name: 'configuration', type: 'tuple' },
      { name: 'liquidityIndex', type: 'uint128' },
      { name: 'currentLiquidityRate', type: 'uint128' },
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
    stateMutability: 'view',
    type: 'function'
  }
] as const

// ERC20 ABI for decimals
const ERC20_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

async function fetchAaveReserveData(): Promise<ReserveData[]> {
  try {
    console.log('Fetching Aave V3 data using direct contract calls...')
    
    // Create viem client for Base
    const client = createPublicClient({
      chain: base,
      transport: http(BASE_RPC_URL)
    })

    const reserves: ReserveData[] = []

    // Fetch data for each token
    for (const [symbol, address] of Object.entries(BASE_TOKEN_ADDRESSES)) {
      try {
        // Get reserve data from Aave V3 Pool
        const reserveData = await client.readContract({
          address: AAVE_V3_POOL_ADDRESS as `0x${string}`,
          abi: AAVE_V3_POOL_ABI,
          functionName: 'getReserveData',
          args: [address as `0x${string}`]
        })

        // Get token decimals
        const decimals = await client.readContract({
          address: address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'decimals'
        })

        // Convert rates from ray (27 decimals) to APY percentages
        const supplyAPY = (Number(reserveData[2]) / 1e25) * 100 // currentLiquidityRate
        const borrowAPY = (Number(reserveData[3]) / 1e25) * 100 // currentVariableBorrowRate

        reserves.push({
          id: address,
          underlyingAsset: address,
          symbol: symbol,
          name: symbol === 'ETH' ? 'Wrapped Ether' : symbol === 'USDC' ? 'USD Coin' : symbol,
          decimals: Number(decimals),
          liquidityRate: reserveData[2].toString(),
          variableBorrowRate: reserveData[3].toString(),
          totalLiquidity: '0', // Not needed for our use case
          totalCurrentVariableDebt: '0', // Not needed for our use case
          priceInEth: '1',
          priceInUsd: '1',
          isActive: true,
          supplyAPY: Number(supplyAPY.toFixed(4)),
          borrowAPY: Number(borrowAPY.toFixed(4)),
          isUsingFallbackData: false
        })

        console.log(`Fetched data for ${symbol}: ${supplyAPY.toFixed(2)}% supply, ${borrowAPY.toFixed(2)}% borrow`)
      } catch (error) {
        console.warn(`Failed to fetch data for ${symbol}:`, error)
      }
    }

    if (reserves.length > 0) {
      console.log(`Successfully fetched data for ${reserves.length} tokens using direct contract calls`)
      return reserves
    } else {
      throw new Error('No reserves data fetched')
    }
  } catch (error) {
    console.error('Error fetching from contracts:', error)
    console.log('Falling back to mock data')
    return MOCK_RESERVE_DATA
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const reserves = await fetchAaveReserveData()
    
    res.status(200).json({
      success: true,
      data: reserves,
      isUsingFallbackData: reserves[0]?.isUsingFallbackData || false,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch Aave data',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
