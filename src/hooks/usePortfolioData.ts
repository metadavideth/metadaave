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

    // Convert from wei to ETH (these are ETH values, not token values)
    const totalSuppliedETH = parseFloat(formatUnits(totalCollateralETH, 18))
    const totalBorrowedETH = parseFloat(formatUnits(totalDebtETH, 18))
    const healthFactorNum = parseFloat(formatUnits(healthFactor, 18))
    const ltvNum = parseFloat(formatUnits(ltv, 4)) // LTV is in basis points (10000 = 100%)
    
    console.log('[portfolio] 🔍 After formatUnits conversion:')
    console.log('[portfolio] totalSuppliedETH:', totalSuppliedETH)
    console.log('[portfolio] totalBorrowedETH:', totalBorrowedETH)
    console.log('[portfolio] healthFactorNum:', healthFactorNum)
    console.log('[portfolio] ltvNum:', ltvNum)
    
    // Convert ETH values to USD (using current ETH price)
    // Aave returns collateral values in ETH terms, but they're actually USD values
    const ETH_TO_USD = 2000 // Current ETH price
    const totalSuppliedUSD = totalSuppliedETH * ETH_TO_USD
    const totalBorrowedUSD = totalBorrowedETH * ETH_TO_USD
    
    console.log('[portfolio] 🔍 After USD conversion:')
    console.log('[portfolio] totalSuppliedUSD:', totalSuppliedUSD)
    console.log('[portfolio] totalBorrowedUSD:', totalBorrowedUSD)
    
    // Debug: Check if values are essentially zero
    console.log('[portfolio] 🔍 Value analysis:')
    console.log('[portfolio] totalSuppliedETH in scientific notation:', totalSuppliedETH.toExponential())
    console.log('[portfolio] totalSuppliedUSD in scientific notation:', totalSuppliedUSD.toExponential())
    console.log('[portfolio] Is totalSuppliedUSD essentially zero?', totalSuppliedUSD < 0.01)

    console.log('[portfolio] Parsed data:', {
      totalCollateralETH: totalCollateralETH.toString(),
      totalDebtETH: totalDebtETH.toString(),
      totalSuppliedETH,
      totalBorrowedETH,
      healthFactorNum,
      ltvNum
    })
    
    console.log('[portfolio] Raw userData array:', userData)
    console.log('[portfolio] Individual values:', {
      totalCollateralETH: userData[0]?.toString(),
      totalDebtETH: userData[1]?.toString(),
      availableBorrowsETH: userData[2]?.toString(),
      currentLiquidationThreshold: userData[3]?.toString(),
      ltv: userData[4]?.toString(),
      healthFactor: userData[5]?.toString()
    })
    
    // Check if userData is actually empty or if the function doesn't exist
    if (!userData || userData.length === 0) {
      console.error('[portfolio] ❌ userData is empty - wrong contract or function?')
      throw new Error('getUserAccountData returned empty data - possible wrong contract')
    }
    
    // Log each individual value to debug
    console.log('[portfolio] 🔍 Debugging individual values:')
    userData.forEach((value, index) => {
      console.log(`[portfolio] userData[${index}]: ${value?.toString()} (type: ${typeof value})`)
    })

    // Handle health factor for no position case
    // Aave returns a very large number (2^256-1) when there are no positions
    const MAX_SAFE_HEALTH_FACTOR = 1e10 // 10 billion - anything larger is considered "infinite"
    const isDustAmount = totalSuppliedUSD < 0.01 // Less than 1 cent is considered dust
    const isNoPosition = totalSuppliedUSD === 0 && totalBorrowedUSD === 0
    const isInfiniteHealthFactor = healthFactorNum > MAX_SAFE_HEALTH_FACTOR
    const effectiveHealthFactor = (isNoPosition || isDustAmount || isInfiniteHealthFactor) ? 0 : healthFactorNum
    
    console.log('[portfolio] 🔍 Health factor analysis:')
    console.log('[portfolio] isNoPosition:', isNoPosition)
    console.log('[portfolio] isDustAmount:', isDustAmount)
    console.log('[portfolio] isInfiniteHealthFactor:', isInfiniteHealthFactor)
    console.log('[portfolio] effectiveHealthFactor:', effectiveHealthFactor)

    // Calculate utilization (borrowed / supplied) - only for meaningful amounts
    const utilization = (totalSuppliedUSD > 0.01 && totalBorrowedUSD > 0) ? (totalBorrowedUSD / totalSuppliedUSD) * 100 : 0

    // Calculate net APY (simplified - in real app you'd calculate based on actual positions)
    const netAPY = totalSuppliedUSD > 0.01 ? '2.85%' : '0.00%' // Placeholder

    // Calculate estimated monthly yield
    const monthlyYield = totalSuppliedUSD > 0.01 ? (totalSuppliedUSD * 0.0285 / 12) : 0

    // Count positions (simplified - count tokens with balance > 0)
    const positions = totalSuppliedUSD > 0.01 || totalBorrowedUSD > 0.01 ? 1 : 0

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
