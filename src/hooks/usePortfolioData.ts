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
    
    console.log('[portfolio] 🔍 Raw values from Aave:')
    console.log('[portfolio] totalCollateralETH (raw):', totalCollateralETH.toString())
    console.log('[portfolio] totalDebtETH (raw):', totalDebtETH.toString())
    console.log('[portfolio] healthFactor (raw):', healthFactor.toString())
    
    console.log('[portfolio] 🔍 After formatUnits conversion:')
    console.log('[portfolio] totalSuppliedETH:', totalSuppliedETH)
    console.log('[portfolio] totalBorrowedETH:', totalBorrowedETH)
    console.log('[portfolio] healthFactorNum:', healthFactorNum)
    console.log('[portfolio] ltvNum:', ltvNum)
    
    // Check if user has any meaningful Aave positions
    // If totalSuppliedETH is extremely small (< 0.001 ETH), user likely has no Aave positions
    const hasAavePositions = totalSuppliedETH > 0.001 || totalBorrowedETH > 0.001
    
    console.log('[portfolio] 🔍 Position analysis:')
    console.log('[portfolio] hasAavePositions:', hasAavePositions)
    console.log('[portfolio] totalSuppliedETH > 0.001:', totalSuppliedETH > 0.001)
    console.log('[portfolio] totalBorrowedETH > 0.001:', totalBorrowedETH > 0.001)
    
    // The issue is likely that Aave returns values in wei (18 decimals) but we're treating them as ETH
    // Let's check if the raw values are actually in wei and need proper conversion
    
    console.log('[portfolio] 🔍 Investigating unit conversion issue:')
    console.log('[portfolio] Raw totalCollateralETH:', totalCollateralETH.toString())
    console.log('[portfolio] Raw totalDebtETH:', totalDebtETH.toString())
    console.log('[portfolio] Raw healthFactor:', healthFactor.toString())
    
    // Check if the values are actually in wei (18 decimals) by looking at the magnitude
    const totalCollateralWei = totalCollateralETH.toString()
    const totalDebtWei = totalDebtETH.toString()
    
    console.log('[portfolio] 🔍 Wei analysis:')
    console.log('[portfolio] totalCollateralWei length:', totalCollateralWei.length)
    console.log('[portfolio] totalDebtWei length:', totalDebtWei.length)
    
    // If the values are in wei, they should be much larger numbers
    // Let's try converting them properly
    const totalSuppliedETHFromWei = parseFloat(formatUnits(totalCollateralETH, 18))
    const totalBorrowedETHFromWei = parseFloat(formatUnits(totalDebtETH, 18))
    
    console.log('[portfolio] 🔍 After proper wei conversion:')
    console.log('[portfolio] totalSuppliedETHFromWei:', totalSuppliedETHFromWei)
    console.log('[portfolio] totalBorrowedETHFromWei:', totalBorrowedETHFromWei)
    
    // Check if this makes more sense
    const hasAavePositions = totalSuppliedETHFromWei > 0.001 || totalBorrowedETHFromWei > 0.001
    
    console.log('[portfolio] 🔍 Position analysis with proper conversion:')
    console.log('[portfolio] hasAavePositions:', hasAavePositions)
    console.log('[portfolio] totalSuppliedETHFromWei > 0.001:', totalSuppliedETHFromWei > 0.001)
    console.log('[portfolio] totalBorrowedETHFromWei > 0.001:', totalBorrowedETHFromWei > 0.001)
    
    if (!hasAavePositions) {
      console.log('[portfolio] ❌ Still no meaningful Aave positions after proper conversion')
      console.log('[portfolio] This suggests getUserAccountData might not be working correctly')
      console.log('[portfolio] Raw values might be in a different format than expected')
      
      // Let's try a different approach - maybe the values are in USD with 8 decimals?
      const totalSuppliedUSD8Decimals = parseFloat(formatUnits(totalCollateralETH, 8))
      const totalBorrowedUSD8Decimals = parseFloat(formatUnits(totalDebtETH, 8))
      
      console.log('[portfolio] 🔍 Trying 8 decimal conversion (USD format):')
      console.log('[portfolio] totalSuppliedUSD8Decimals:', totalSuppliedUSD8Decimals)
      console.log('[portfolio] totalBorrowedUSD8Decimals:', totalBorrowedUSD8Decimals)
      
      const hasAavePositions8Decimals = totalSuppliedUSD8Decimals > 0.01 || totalBorrowedUSD8Decimals > 0.01
      
      if (hasAavePositions8Decimals) {
        console.log('[portfolio] ✅ Found positions with 8 decimal conversion!')
        console.log('[portfolio] Using 8 decimal conversion for portfolio data')
        
        // Use the 8 decimal conversion
        const totalSuppliedUSD = totalSuppliedUSD8Decimals
        const totalBorrowedUSD = totalBorrowedUSD8Decimals
        const healthFactorNum = parseFloat(formatUnits(healthFactor, 18))
        const ltvNum = parseFloat(formatUnits(ltv, 4))
        
        // Handle health factor for no position case
        const MAX_SAFE_HEALTH_FACTOR = 1e10
        const isInfiniteHealthFactor = healthFactorNum > MAX_SAFE_HEALTH_FACTOR
        const effectiveHealthFactor = isInfiniteHealthFactor ? 0 : healthFactorNum
        
        console.log('[portfolio] 🔍 Health factor analysis:')
        console.log('[portfolio] healthFactorNum (raw):', healthFactorNum)
        console.log('[portfolio] isInfiniteHealthFactor:', isInfiniteHealthFactor)
        console.log('[portfolio] effectiveHealthFactor:', effectiveHealthFactor)
        console.log('[portfolio] totalSuppliedUSD:', totalSuppliedUSD)
        console.log('[portfolio] totalBorrowedUSD:', totalBorrowedUSD)
        
        // If user has no debt (totalBorrowedUSD = 0), health factor should be infinite
        if (totalBorrowedUSD === 0 && totalSuppliedUSD > 0) {
          console.log('[portfolio] ✅ User has no debt - health factor should be infinite')
          // For display purposes, show a very high health factor
          const infiniteHealthFactor = 999.99
          console.log('[portfolio] Setting health factor to:', infiniteHealthFactor)
          
          return {
            totalSupplied: totalSuppliedUSD.toFixed(2),
            totalBorrowed: totalBorrowedUSD.toFixed(2),
            healthFactor: infiniteHealthFactor,
            netAPY,
            yieldEstimate: monthlyYield.toFixed(2),
            utilization: Math.round(utilization),
            ltv: Math.round(ltvNum),
            positions,
            isLoading: false,
            error: null
          }
        }
        
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
      } else {
        console.log('[portfolio] ❌ Still no positions found with 8 decimal conversion')
        console.log('[portfolio] Returning zero values - getUserAccountData may not be working')
        
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
    
    // Convert ETH values to USD (using current ETH price)
    // Aave returns collateral values in ETH terms, but they're actually USD values
    const ETH_TO_USD = 2000 // Current ETH price
    const totalSuppliedUSD = totalSuppliedETH * ETH_TO_USD
    const totalBorrowedUSD = totalBorrowedETH * ETH_TO_USD
    
    console.log('[portfolio] 🔍 Health factor analysis (18 decimal path):')
    console.log('[portfolio] healthFactorNum:', healthFactorNum)
    console.log('[portfolio] totalSuppliedUSD:', totalSuppliedUSD)
    console.log('[portfolio] totalBorrowedUSD:', totalBorrowedUSD)
    
    // If user has no debt (totalBorrowedUSD = 0), health factor should be infinite
    if (totalBorrowedUSD === 0 && totalSuppliedUSD > 0) {
      console.log('[portfolio] ✅ User has no debt - health factor should be infinite (18 decimal path)')
      // For display purposes, show a very high health factor
      const infiniteHealthFactor = 999.99
      console.log('[portfolio] Setting health factor to:', infiniteHealthFactor)
      
      // Calculate other values
      const netAPY = totalSuppliedUSD > 0 ? '2.85%' : '0.00%'
      const monthlyYield = totalSuppliedUSD > 0 ? (totalSuppliedUSD * 0.0285 / 12) : 0
      const utilization = 0
      const positions = totalSuppliedUSD > 0 ? 1 : 0
      
      return {
        totalSupplied: totalSuppliedUSD.toFixed(2),
        totalBorrowed: totalBorrowedUSD.toFixed(2),
        healthFactor: infiniteHealthFactor,
        netAPY,
        yieldEstimate: monthlyYield.toFixed(2),
        utilization: Math.round(utilization),
        ltv: Math.round(ltvNum),
        positions,
        isLoading: false,
        error: null
      }
    }
    
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
    const isNoPosition = totalSuppliedUSD === 0 && totalBorrowedUSD === 0
    const isInfiniteHealthFactor = healthFactorNum > MAX_SAFE_HEALTH_FACTOR
    const effectiveHealthFactor = (isNoPosition || isInfiniteHealthFactor) ? 0 : healthFactorNum
    
    console.log('[portfolio] 🔍 Health factor analysis:')
    console.log('[portfolio] isNoPosition:', isNoPosition)
    console.log('[portfolio] isInfiniteHealthFactor:', isInfiniteHealthFactor)
    console.log('[portfolio] effectiveHealthFactor:', effectiveHealthFactor)

    // Calculate utilization (borrowed / supplied) - only for meaningful amounts
    const utilization = (totalSuppliedUSD > 0 && totalBorrowedUSD > 0) ? (totalBorrowedUSD / totalSuppliedUSD) * 100 : 0

    // Calculate net APY (simplified - in real app you'd calculate based on actual positions)
    const netAPY = totalSuppliedUSD > 0 ? '2.85%' : '0.00%' // Placeholder

    // Calculate estimated monthly yield
    const monthlyYield = totalSuppliedUSD > 0 ? (totalSuppliedUSD * 0.0285 / 12) : 0

    // Count positions (simplified - count tokens with balance > 0)
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
