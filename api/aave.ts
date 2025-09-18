import { VercelRequest, VercelResponse } from '@vercel/node'
import { UiPoolDataProvider } from '@aave/contract-helpers'
import { formatReserves } from '@aave/math-utils'
import { ethers } from 'ethers'

// Base network configuration
const BASE_CHAIN_ID = 8453
const BASE_RPC_URL = 'https://mainnet.base.org'

// Aave V3 Pool addresses on Base (from Aave Address Book)
const AAVE_V3_POOL_ADDRESS = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951'
const UI_POOL_DATA_PROVIDER_ADDRESS = '0x174446A67401D7d7Dd94A6BA2C8b56d0e4b2a1e5'

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

async function fetchAaveReserveData(): Promise<ReserveData[]> {
  try {
    console.log('Fetching Aave V3 data using Aave SDK...')
    
    // Create provider for Base network
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL)
    
    // Initialize UiPoolDataProvider
    const poolDataProviderContract = new UiPoolDataProvider({
      uiPoolDataProviderAddress: UI_POOL_DATA_PROVIDER_ADDRESS,
      provider,
      chainId: BASE_CHAIN_ID,
    })

    // Get reserves data
    const reservesData = await poolDataProviderContract.getReservesHumanized({
      lendingPoolAddressProvider: AAVE_V3_POOL_ADDRESS,
    })

    console.log(`Successfully fetched ${reservesData.reservesData.length} reserves using Aave SDK`)

    // Convert to our format
    const reserves: ReserveData[] = reservesData.reservesData.map((reserve: any) => ({
      id: reserve.underlyingAsset,
      underlyingAsset: reserve.underlyingAsset,
      symbol: reserve.symbol,
      name: reserve.name,
      decimals: reserve.decimals,
      liquidityRate: reserve.liquidityRate,
      variableBorrowRate: reserve.variableBorrowRate,
      totalLiquidity: reserve.totalLiquidity,
      totalCurrentVariableDebt: reserve.totalCurrentVariableDebt,
      priceInEth: reserve.priceInEth,
      priceInUsd: reserve.priceInUsd,
      isActive: reserve.isActive,
      supplyAPY: parseFloat(reserve.liquidityRate) * 100,
      borrowAPY: parseFloat(reserve.variableBorrowRate) * 100,
      isUsingFallbackData: false
    }))

    return reserves
  } catch (error) {
    console.error('Error fetching from Aave SDK:', error)
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
