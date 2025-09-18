import { VercelRequest, VercelResponse } from '@vercel/node'

// Aave V3 Base subgraph endpoint
const AAVE_V3_BASE_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/id/D7mapexM5ZsQckLJai2FawTKXJ7CqYGKM8PErnS3cJi9'

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
}

interface AaveReserveData {
  reserves: ReserveData[]
}

// GraphQL query for Aave V3 Base reserves
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
      isActive
    }
  }
`

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
    isActive: true
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
    isActive: true
  }
]

async function fetchAaveReserveData(): Promise<ReserveData[]> {
  try {
    console.log('Fetching Aave V3 data from Base subgraph...')
    
    const reserveAddresses = Object.values(BASE_TOKEN_ADDRESSES)
    
    const response = await fetch(AAVE_V3_BASE_SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GET_RESERVE_DATA,
        variables: { reserveAddresses }
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: { data: AaveReserveData; errors?: any[] } = await response.json()

    if (data.errors && data.errors.length > 0) {
      throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`)
    }

    if (data.data?.reserves?.length > 0) {
      console.log(`Successfully fetched ${data.data.reserves.length} reserves from Base subgraph`)
      return data.data.reserves
    } else {
      throw new Error('No reserves data found in subgraph response')
    }
  } catch (error) {
    console.error('Error fetching from Base subgraph:', error)
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
    
    // Convert rates from ray (27 decimals) to APY percentages
    const enrichedReserves = reserves.map(reserve => {
      const supplyAPY = (Number(reserve.liquidityRate) / 1e25) * 100
      const borrowAPY = (Number(reserve.variableBorrowRate) / 1e25) * 100
      
      return {
        ...reserve,
        supplyAPY: Number(supplyAPY.toFixed(4)),
        borrowAPY: Number(borrowAPY.toFixed(4)),
        isUsingFallbackData: reserves === MOCK_RESERVE_DATA
      }
    })

    res.status(200).json({
      success: true,
      data: enrichedReserves,
      isUsingFallbackData: reserves === MOCK_RESERVE_DATA,
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
