import { VercelRequest, VercelResponse } from '@vercel/node'

// Base network configuration
const BASE_CHAIN_ID = 8453

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
  supplyAPY: number
  borrowAPY: number
  isUsingFallbackData: boolean
}

// Realistic mock data based on typical Aave V3 rates
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
  // For now, return mock data with clear indication
  console.log('Using realistic mock data - Aave V3 Base contracts temporarily unavailable')
  return MOCK_RESERVE_DATA
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