import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { createWalletClient, createPublicClient, http, getContract } from 'viem'
import { baseSepolia } from 'viem/chains'
import { getAuthenticatedAddress, getFarcasterSDK, isFarcasterEnvironment, mockFarcasterUser } from '../utils/farcaster'
import type { Token } from '../types'

// Aave V3 Pool ABI - minimal for core functions
const AAVE_V3_POOL_ABI = [
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' }
    ],
    name: 'supply',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'interestRateMode', type: 'uint256' },
      { name: 'referralCode', type: 'uint16' },
      { name: 'onBehalfOf', type: 'address' }
    ],
    name: 'borrow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'rateMode', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' }
    ],
    name: 'repay',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'to', type: 'address' }
    ],
    name: 'withdraw',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

// ERC20 ABI for approvals
const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

// Aave V3 Pool address on Base Sepolia
const AAVE_V3_POOL_ADDRESS = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951'

// Transaction fee (0.1%)
const TRANSACTION_FEE_RATE = 0.001

interface TransactionParams {
  token: Token
  amount: string
  action: 'supply' | 'borrow' | 'repay' | 'withdraw'
}

interface TransactionResult {
  hash: string
  action: string
  amount: string
  token: string
  fee: string
}

// Calculate transaction fee
export function calculateTransactionFee(amount: string): string {
  const numAmount = Number.parseFloat(amount) || 0
  return (numAmount * TRANSACTION_FEE_RATE).toFixed(6)
}

// Check if we're in a real Farcaster environment with actual wallet
async function isRealFarcasterEnvironment() {
  try {
    const sdk = getFarcasterSDK()
    if (!sdk || !isFarcasterEnvironment()) return false
    
    // Check if we have a real authenticated user (not mock)
    const isAuthenticated = await sdk.actions.isAuthenticated()
    if (!isAuthenticated) return false
    
    const userData = await sdk.actions.getUserData()
    // If we get mock data, we're in previewer/development
    return userData && userData.address !== mockFarcasterUser.address
  } catch (error) {
    console.warn('Error checking real Farcaster environment:', error)
    return false
  }
}

// Get Farcaster wallet client with proper error handling
async function getFarcasterWalletClient() {
  try {
    // Get the authenticated address
    const address = await getAuthenticatedAddress()
    
    if (!address) {
      throw new Error('No authenticated address found')
    }

    // Check if we're in a real Farcaster environment
    const isRealEnv = await isRealFarcasterEnvironment()
    
    if (!isRealEnv) {
      // In previewer/development, return a mock client that simulates transactions
      return createMockWalletClient(address as `0x${string}`)
    }

    // In real Farcaster environment, create actual wallet client
    return createWalletClient({
      chain: baseSepolia,
      transport: http(),
      account: address as `0x${string}`,
    })
  } catch (error) {
    console.error('Failed to create Farcaster wallet client:', error)
    throw new Error(`Failed to initialize wallet: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Create a mock wallet client for development/previewer
function createMockWalletClient(address: `0x${string}`) {
  return {
    chain: baseSepolia,
    account: address,
    writeContract: async (params: any) => {
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Return a mock transaction hash
      return `0x${Math.random().toString(16).substr(2, 64)}` as `0x${string}`
    },
    readContract: async (params: any) => {
      // For read operations, use the public client
      return publicClient.readContract(params)
    }
  } as any
}

// Create public client for reading
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

// Execute Aave V3 transaction
async function executeAaveTransaction(params: TransactionParams): Promise<TransactionResult> {
  const { token, amount, action } = params
  
  try {
    // Check if we're in a real Farcaster environment
    const isRealEnv = await isRealFarcasterEnvironment()
    
    // Get Farcaster wallet client
    const walletClient = await getFarcasterWalletClient()
    const userAddress = await getAuthenticatedAddress()
    
    if (!userAddress) {
      throw new Error('No authenticated address found')
    }

    const tokenAddress = token.address as `0x${string}`
    const amountWei = parseUnits(amount, token.decimals || 18)
    const fee = calculateTransactionFee(amount)

    if (!isRealEnv) {
      // In previewer/development, simulate the transaction
      console.log(`[MOCK] Simulating ${action} transaction for ${amount} ${token.symbol}`)
      console.log(`[MOCK] User: ${userAddress}`)
      console.log(`[MOCK] Token: ${tokenAddress}`)
      console.log(`[MOCK] Amount: ${amountWei.toString()}`)
      console.log(`[MOCK] Fee: ${fee} ${token.symbol}`)
    }

    // Create Aave V3 Pool contract
    const poolContract = getContract({
      address: AAVE_V3_POOL_ADDRESS,
      abi: AAVE_V3_POOL_ABI,
      client: walletClient,
    })

    let txHash: string

    switch (action) {
      case 'supply':
        // Check and approve token if needed
        await ensureTokenApproval(tokenAddress, AAVE_V3_POOL_ADDRESS, amountWei, userAddress)
        
        // Execute supply transaction
        txHash = await poolContract.write.supply([
          tokenAddress,
          amountWei,
          userAddress,
          0 // referralCode
        ])
        break

      case 'borrow':
        // Execute borrow transaction (variable rate = 2)
        txHash = await poolContract.write.borrow([
          tokenAddress,
          amountWei,
          2, // interestRateMode (variable)
          0, // referralCode
          userAddress
        ])
        break

      case 'repay':
        // Check and approve token if needed
        await ensureTokenApproval(tokenAddress, AAVE_V3_POOL_ADDRESS, amountWei, userAddress)
        
        // Execute repay transaction (variable rate = 2)
        txHash = await poolContract.write.repay([
          tokenAddress,
          amountWei,
          2, // rateMode (variable)
          userAddress
        ])
        break

      case 'withdraw':
        // Execute withdraw transaction
        txHash = await poolContract.write.withdraw([
          tokenAddress,
          amountWei,
          userAddress
        ])
        break

      default:
        throw new Error(`Unsupported action: ${action}`)
    }

    return {
      hash: txHash,
      action,
      amount,
      token: token.symbol,
      fee
    }
  } catch (error) {
    console.error(`Error executing ${action} transaction:`, error)
    throw new Error(`Failed to ${action} ${token.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Ensure token approval for Aave V3 Pool
async function ensureTokenApproval(
  tokenAddress: `0x${string}`,
  spenderAddress: string,
  amount: bigint,
  userAddress: `0x${string}`
) {
  try {
    const tokenContract = getContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      client: publicClient,
    })

    // Check current allowance
    const currentAllowance = await tokenContract.read.allowance([userAddress, spenderAddress])
    
    if (currentAllowance < amount) {
      // Need to approve
      const walletClient = await getFarcasterWalletClient()
      const tokenContractWrite = getContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        client: walletClient,
      })

      // Approve maximum amount for gas efficiency
      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
      await tokenContractWrite.write.approve([spenderAddress, maxApproval])
    }
  } catch (error) {
    // In mock environment, approval might fail, but that's okay
    const isRealEnv = await isRealFarcasterEnvironment()
    if (!isRealEnv) {
      console.log(`[MOCK] Token approval simulation for ${tokenAddress}`)
      return // Skip approval in mock environment
    }
    throw error
  }
}

// Hook for Aave V3 transactions
export function useAaveTransactions() {
  const queryClient = useQueryClient()
  const { address } = useAccount()

  const supplyMutation = useMutation({
    mutationFn: (params: Omit<TransactionParams, 'action'>) => 
      executeAaveTransaction({ ...params, action: 'supply' }),
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['aave-data'] })
      queryClient.invalidateQueries({ queryKey: ['token-balances'] })
    },
  })

  const borrowMutation = useMutation({
    mutationFn: (params: Omit<TransactionParams, 'action'>) => 
      executeAaveTransaction({ ...params, action: 'borrow' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aave-data'] })
      queryClient.invalidateQueries({ queryKey: ['token-balances'] })
    },
  })

  const repayMutation = useMutation({
    mutationFn: (params: Omit<TransactionParams, 'action'>) => 
      executeAaveTransaction({ ...params, action: 'repay' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aave-data'] })
      queryClient.invalidateQueries({ queryKey: ['token-balances'] })
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: (params: Omit<TransactionParams, 'action'>) => 
      executeAaveTransaction({ ...params, action: 'withdraw' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aave-data'] })
      queryClient.invalidateQueries({ queryKey: ['token-balances'] })
    },
  })

  return {
    supply: supplyMutation,
    borrow: borrowMutation,
    repay: repayMutation,
    withdraw: withdrawMutation,
  }
}
