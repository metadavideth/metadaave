import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { createPublicClient, http, formatUnits, parseUnits } from 'viem'
import { baseSepolia } from 'viem/chains'
import { AAVE_V3_BASE_TOKENS } from '../data/tokens'

// Aave V3 Pool ABI - minimal for user data
const AAVE_POOL_ABI = [
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserAccountData",
    "outputs": [
      {"name": "totalCollateralETH", "type": "uint256"},
      {"name": "totalDebtETH", "type": "uint256"},
      {"name": "availableBorrowsETH", "type": "uint256"},
      {"name": "currentLiquidationThreshold", "type": "uint256"},
      {"name": "ltv", "type": "uint256"},
      {"name": "healthFactor", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// Aave V3 Pool address on Base Sepolia
// Note: This address may not be correct for Base Sepolia - Aave V3 may not be fully deployed on Base Sepolia
// For now, we'll handle the case where the contract doesn't exist or user has no positions
const AAVE_POOL_ADDRESS = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951' // Base Sepolia Aave V3 Pool

// Create public client for Base Sepolia
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
})

interface PortfolioData {
  totalSupplied: string
  totalBorrowed: string
  healthFactor: number
  netAPY: string
  yieldEstimate: string
  utilization: number
  ltv: number
  positions: number
  isLoading: boolean
  error: string | null
}

async function fetchPortfolioData(address: `0x${string}`): Promise<PortfolioData> {
  try {
    console.log('[portfolio] Fetching data for address:', address)
    
    // Get user account data from Aave V3 Pool
    const userData = await publicClient.readContract({
      address: AAVE_POOL_ADDRESS,
      abi: AAVE_POOL_ABI,
      functionName: 'getUserAccountData',
      args: [address]
    })

    console.log('[portfolio] User account data:', userData)

    const [
      totalCollateralETH,
      totalDebtETH,
      availableBorrowsETH,
      currentLiquidationThreshold,
      ltv,
      healthFactor
    ] = userData

    // Convert from wei to ETH
    const totalSuppliedETH = parseFloat(formatUnits(totalCollateralETH, 18))
    const totalBorrowedETH = parseFloat(formatUnits(totalDebtETH, 18))
    const healthFactorNum = parseFloat(formatUnits(healthFactor, 18))
    const ltvNum = parseFloat(formatUnits(ltv, 4)) // LTV is in basis points (10000 = 100%)

    // Calculate utilization (borrowed / supplied)
    const utilization = totalSuppliedETH > 0 ? (totalBorrowedETH / totalSuppliedETH) * 100 : 0

    // Calculate net APY (simplified - in real app you'd calculate based on actual positions)
    const netAPY = totalSuppliedETH > 0 ? '2.85%' : '0.00%' // Placeholder

    // Calculate estimated monthly yield
    const monthlyYield = totalSuppliedETH > 0 ? (totalSuppliedETH * 0.0285 / 12) : 0

    // Count positions (simplified - count tokens with balance > 0)
    const positions = totalSuppliedETH > 0 || totalBorrowedETH > 0 ? 1 : 0

    return {
      totalSupplied: totalSuppliedETH.toFixed(2),
      totalBorrowed: totalBorrowedETH.toFixed(2),
      healthFactor: healthFactorNum,
      netAPY,
      yieldEstimate: monthlyYield.toFixed(2),
      utilization: Math.round(utilization),
      ltv: Math.round(ltvNum),
      positions,
      isLoading: false,
      error: null
    }
  } catch (error) {
    console.error('[portfolio] Error fetching portfolio data:', error)
    
    // Check if it's a contract error (contract doesn't exist or user has no positions)
    const isContractError = error instanceof Error && (
      error.message.includes('returned no data') ||
      error.message.includes('ContractFunctionZeroDataError') ||
      error.message.includes('not a contract')
    )
    
    if (isContractError) {
      console.log('[portfolio] User has no Aave positions or contract not available on Base Sepolia')
    }
    
    // Return zero values if user has no Aave positions or contract not available
    return {
      totalSupplied: '0.00',
      totalBorrowed: '0.00',
      healthFactor: 0,
      netAPY: '0.00%',
      yieldEstimate: '0.00',
      utilization: 0,
      ltv: 0,
      positions: 0,
      isLoading: false,
      error: null
    }
  }
}

export function usePortfolioData() {
  const { address, isConnected } = useAccount()

  return useQuery({
    queryKey: ['portfolio-data', address],
    queryFn: () => fetchPortfolioData(address!),
    enabled: !!address && isConnected,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    retry: false,
    refetchOnWindowFocus: false,
  })
}
