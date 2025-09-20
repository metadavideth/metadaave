import { VercelRequest, VercelResponse } from '@vercel/node'
import { UiPoolDataProvider } from '@aave/contract-helpers'
import { ethers } from 'ethers'

// Base mainnet configuration (for data fetching - Aave V3 is fully deployed here)
const BASE_CHAIN_ID = 8453
const BASE_RPC_URL = 'https://mainnet.base.org'

// Aave V3 Pool addresses on Base (from Aave Address Book)
const AAVE_V3_POOL_ADDRESS = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5'
const UI_POOL_DATA_PROVIDER_ADDRESS = '0x68100bD5345eA474D93577127C11F39FF8463e93'

// Token addresses on Base (matching frontend)
const BASE_TOKEN_ADDRESSES = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
  cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
  WETH: '0x4200000000000000000000000000000000000006',
  cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
  EURC: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
  tBTC: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b',
  GHO: '0x6Bb7a212910682DCFdbd5BCBb3e28FB4E8da10Ee'
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
  supplyAPY: number
  borrowAPY: number
  isUsingFallbackData: boolean
}

// Fallback mock data for Base
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
    id: BASE_TOKEN_ADDRESSES.USDbC,
    underlyingAsset: BASE_TOKEN_ADDRESSES.USDbC,
    symbol: 'USDbC',
    name: 'USD Base Coin',
    decimals: 6,
    liquidityRate: '40000000000000000000000000', // ~4% APY in ray
    variableBorrowRate: '60000000000000000000000000', // ~6% APY in ray
    totalLiquidity: '1000000000000', // 1M USDbC
    totalCurrentVariableDebt: '500000000000', // 500K USDbC
    priceInEth: '0.0005',
    priceInUsd: '1.00',
    isActive: true,
    supplyAPY: 4.0,
    borrowAPY: 6.0,
    isUsingFallbackData: true
  },
  {
    id: BASE_TOKEN_ADDRESSES.cbBTC,
    underlyingAsset: BASE_TOKEN_ADDRESSES.cbBTC,
    symbol: 'cbBTC',
    name: 'Coinbase Wrapped Bitcoin',
    decimals: 8,
    liquidityRate: '20000000000000000000000000', // ~2% APY in ray
    variableBorrowRate: '40000000000000000000000000', // ~4% APY in ray
    totalLiquidity: '100000000', // 1 BTC
    totalCurrentVariableDebt: '50000000', // 0.5 BTC
    priceInEth: '15.0',
    priceInUsd: '30000.00',
    isActive: true,
    supplyAPY: 2.0,
    borrowAPY: 4.0,
    isUsingFallbackData: true
  },
  {
    id: BASE_TOKEN_ADDRESSES.WETH,
    underlyingAsset: BASE_TOKEN_ADDRESSES.WETH,
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
  },
  {
    id: BASE_TOKEN_ADDRESSES.cbETH,
    underlyingAsset: BASE_TOKEN_ADDRESSES.cbETH,
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    decimals: 18,
    liquidityRate: '31000000000000000000000000', // ~3.1% APY in ray
    variableBorrowRate: '51000000000000000000000000', // ~5.1% APY in ray
    totalLiquidity: '1000000000000000000000', // 1000 cbETH
    totalCurrentVariableDebt: '500000000000000000000', // 500 cbETH
    priceInEth: '1.0',
    priceInUsd: '2000.00',
    isActive: true,
    supplyAPY: 3.1,
    borrowAPY: 5.1,
    isUsingFallbackData: true
  },
  {
    id: BASE_TOKEN_ADDRESSES.EURC,
    underlyingAsset: BASE_TOKEN_ADDRESSES.EURC,
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    liquidityRate: '20000000000000000000000000', // ~2% APY in ray
    variableBorrowRate: '40000000000000000000000000', // ~4% APY in ray
    totalLiquidity: '1000000000000', // 1M EURC
    totalCurrentVariableDebt: '500000000000', // 500K EURC
    priceInEth: '0.00045',
    priceInUsd: '0.90',
    isActive: true,
    supplyAPY: 2.0,
    borrowAPY: 4.0,
    isUsingFallbackData: true
  },
  {
    id: BASE_TOKEN_ADDRESSES.tBTC,
    underlyingAsset: BASE_TOKEN_ADDRESSES.tBTC,
    symbol: 'tBTC',
    name: 'Threshold Bitcoin',
    decimals: 18,
    liquidityRate: '18500000000000000000000000', // ~1.85% APY in ray
    variableBorrowRate: '35000000000000000000000000', // ~3.5% APY in ray
    totalLiquidity: '1000000000000000000000', // 1 tBTC
    totalCurrentVariableDebt: '500000000000000000000', // 0.5 tBTC
    priceInEth: '15.0',
    priceInUsd: '30000.00',
    isActive: true,
    supplyAPY: 1.85,
    borrowAPY: 3.5,
    isUsingFallbackData: true
  },
  {
    id: BASE_TOKEN_ADDRESSES.GHO,
    underlyingAsset: BASE_TOKEN_ADDRESSES.GHO,
    symbol: 'GHO',
    name: 'Aave GHO',
    decimals: 18,
    liquidityRate: '35000000000000000000000000', // ~3.5% APY in ray
    variableBorrowRate: '55000000000000000000000000', // ~5.5% APY in ray
    totalLiquidity: '1000000000000000000000000', // 1M GHO
    totalCurrentVariableDebt: '500000000000000000000000', // 500K GHO
    priceInEth: '0.0005',
    priceInUsd: '1.00',
    isActive: true,
    supplyAPY: 3.5,
    borrowAPY: 5.5,
    isUsingFallbackData: true
  }
]

async function fetchAaveReserveData(): Promise<ReserveData[]> {
  try {
    console.log('Fetching Aave V3 data using Aave SDK...')
    console.log('RPC URL:', BASE_RPC_URL)
    console.log('Chain ID:', BASE_CHAIN_ID)
    console.log('UI Pool Data Provider:', UI_POOL_DATA_PROVIDER_ADDRESS)
    
    // Create provider for Base network with timeout
    const provider = new ethers.providers.JsonRpcProvider(BASE_RPC_URL, {
      name: 'base',
      chainId: BASE_CHAIN_ID,
    })
    
    console.log('Provider created, testing connection...')
    
    // Test the connection first
    const blockNumber = await provider.getBlockNumber()
    console.log('Connected to Base network, block number:', blockNumber)
    
    // Initialize UiPoolDataProvider
    const poolDataProviderContract = new UiPoolDataProvider({
      uiPoolDataProviderAddress: UI_POOL_DATA_PROVIDER_ADDRESS,
      provider,
      chainId: BASE_CHAIN_ID,
    })

    console.log('UiPoolDataProvider initialized, calling getReservesHumanized...')

    // Get reserves data with timeout
    const reservesData = await Promise.race([
      poolDataProviderContract.getReservesHumanized({
        lendingPoolAddressProvider: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D', // Pool Address Provider
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 20000)
      )
    ]) as any

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
      supplyAPY: (parseFloat(reserve.liquidityRate) / 1e27) * 100,
      borrowAPY: (parseFloat(reserve.variableBorrowRate) / 1e27) * 100,
      isUsingFallbackData: false
    }))

    console.log('Converted reserves data, returning real data')
    return reserves
  } catch (error) {
    console.error('Error fetching from Aave SDK:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    console.log('Falling back to mock data - rates will be simulated')
    
    // Return mock data with correct fallback flag
    const mockDataWithCorrectFlag = MOCK_RESERVE_DATA.map(reserve => ({
      ...reserve,
      isUsingFallbackData: true  // Correctly mark as fallback data
    }))
    return mockDataWithCorrectFlag
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
    
    const isUsingFallback = reserves[0]?.isUsingFallbackData || false
    
    // Add header to make it clear when using fallback data
    if (isUsingFallback) {
      res.setHeader('X-Data-Source', 'mock-fallback')
    } else {
      res.setHeader('X-Data-Source', 'aave-sdk-real')
    }
    
    res.status(200).json({
      success: true,
      data: reserves,
      isUsingFallbackData: isUsingFallback,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch Aave data',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: MOCK_RESERVE_DATA, // Always return mock data on error
      isUsingFallbackData: true,
      timestamp: new Date().toISOString()
    })
  }
}