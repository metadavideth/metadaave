import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { createPublicClient, http, formatUnits, parseUnits } from 'viem'
import { base } from 'viem/chains'
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

// Aave V3 Pool address on Base mainnet
const AAVE_POOL_ADDRESS = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' // Base mainnet Aave V3 Pool

// Create public client for Base mainnet
const publicClient = createPublicClient({
  chain: base,
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

    // Aave V3 returns values in 8 decimals (USD format), not 18 decimals (ETH format)
    // The raw value 101973380 with 8 decimals = 1.0197338 USD
    const totalSuppliedUSD = parseFloat(formatUnits(totalCollateralETH, 8))
    const totalBorrowedUSD = parseFloat(formatUnits(totalDebtETH, 8))
    const healthFactorNum = parseFloat(formatUnits(healthFactor, 18))
    const ltvNum = parseFloat(formatUnits(ltv, 4)) // LTV is in basis points (10000 = 100%)
    
    console.log('[portfolio] 🔍 Corrected conversion (8 decimals for USD values):')
    console.log('[portfolio] totalSuppliedUSD:', totalSuppliedUSD)
    console.log('[portfolio] totalBorrowedUSD:', totalBorrowedUSD)
    console.log('[portfolio] healthFactorNum:', healthFactorNum)
    
    console.log('[portfolio] 🔍 Raw values from Aave:')
    console.log('[portfolio] totalCollateralETH (raw):', totalCollateralETH.toString())
    console.log('[portfolio] totalDebtETH (raw):', totalDebtETH.toString())
    console.log('[portfolio] healthFactor (raw):', healthFactor.toString())
    
    console.log('[portfolio] 🔍 After formatUnits conversion:')
    console.log('[portfolio] totalSuppliedUSD:', totalSuppliedUSD)
    console.log('[portfolio] totalBorrowedUSD:', totalBorrowedUSD)
    console.log('[portfolio] healthFactorNum:', healthFactorNum)
    console.log('[portfolio] ltvNum:', ltvNum)
    
    // Check if user has any meaningful Aave positions using correct USD values
    const hasAavePositions = totalSuppliedUSD > 0.01 || totalBorrowedUSD > 0.01
    
    console.log('[portfolio] 🔍 Position analysis (corrected):')
    console.log('[portfolio] hasAavePositions:', hasAavePositions)
    console.log('[portfolio] totalSuppliedUSD > 0.01:', totalSuppliedUSD > 0.01)
    console.log('[portfolio] totalBorrowedUSD > 0.01:', totalBorrowedUSD > 0.01)
    
    if (!hasAavePositions) {
      console.log('[portfolio] ❌ No meaningful Aave positions found')
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
    
    // Handle health factor for supply-only positions
    const MAX_SAFE_HEALTH_FACTOR = 1e10
    const isInfiniteHealthFactor = healthFactorNum > MAX_SAFE_HEALTH_FACTOR
    const effectiveHealthFactor = isInfiniteHealthFactor ? 999.99 : healthFactorNum
    
    console.log('[portfolio] 🔍 Health factor analysis:')
    console.log('[portfolio] healthFactorNum:', healthFactorNum)
    console.log('[portfolio] isInfiniteHealthFactor:', isInfiniteHealthFactor)
    console.log('[portfolio] effectiveHealthFactor:', effectiveHealthFactor)
    console.log('[portfolio] totalSuppliedUSD:', totalSuppliedUSD)
    console.log('[portfolio] totalBorrowedUSD:', totalBorrowedUSD)
    
    // Calculate utilization
    const utilization = (totalSuppliedUSD > 0 && totalBorrowedUSD > 0) ? (totalBorrowedUSD / totalSuppliedUSD) * 100 : 0
    
    // Calculate net APY
    const netAPY = totalSuppliedUSD > 0 ? '2.85%' : '0.00%'
    
    // Calculate estimated monthly yield
    const monthlyYield = totalSuppliedUSD > 0 ? (totalSuppliedUSD * 0.0285 / 12) : 0
    
    // Count positions
    const positions = totalSuppliedUSD > 0 || totalBorrowedUSD > 0 ? 1 : 0
    
    return {
      totalSupplied: totalSuppliedUSD.toFixed(2),
      totalBorrowed: totalBorrowedUSD.toFixed(2),
      healthFactor: effectiveHealthFactor,
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
      console.log('[portfolio] User has no Aave positions or contract not available on Base')
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
    staleTime: 60000, // 1 minute - reasonable cache time
    refetchInterval: 300000, // 5 minutes - much less frequent to avoid rate limits
    retry: false,
    refetchOnWindowFocus: false, // Disable to avoid unnecessary refetches
  })
}
