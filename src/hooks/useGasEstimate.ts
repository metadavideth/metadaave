import { useQuery } from '@tanstack/react-query'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'

// Create public client for Base mainnet
const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

// Base mainnet gas price estimation
async function estimateGasFee(): Promise<{
  gasPrice: bigint
  gasPriceGwei: string
  gasPriceUSD: string
}> {
  try {
    // Get current gas price from Base
    const gasPrice = await publicClient.getGasPrice()
    
    // Convert to Gwei (1 Gwei = 10^9 wei)
    const gasPriceGwei = formatUnits(gasPrice, 9)
    
    // Estimate gas cost for a typical Aave transaction (around 200,000 gas)
    const estimatedGasLimit = 200000n
    const gasCostWei = gasPrice * estimatedGasLimit
    
    // Convert to ETH
    const gasCostETH = parseFloat(formatUnits(gasCostWei, 18))
    
    // Rough ETH to USD conversion (this should be dynamic in production)
    const ethPriceUSD = 2000 // This should be fetched from a price API
    const gasPriceUSD = (gasCostETH * ethPriceUSD).toFixed(2)
    
    return {
      gasPrice,
      gasPriceGwei,
      gasPriceUSD
    }
  } catch (error) {
    console.warn('Failed to estimate gas fee:', error)
    // Fallback to reasonable estimate for Base
    return {
      gasPrice: 1000000000n, // 1 Gwei
      gasPriceGwei: '1.0',
      gasPriceUSD: '0.10'
    }
  }
}

// Hook to get gas fee estimate
export function useGasEstimate() {
  return useQuery({
    queryKey: ['gas-estimate'],
    queryFn: estimateGasFee,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    retry: false,
    refetchOnWindowFocus: false,
  })
}
