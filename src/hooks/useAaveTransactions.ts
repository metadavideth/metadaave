import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { createWalletClient, createPublicClient, http, getContract } from 'viem'
import { base } from 'viem/chains'
import { getAuthenticatedAddress, getFarcasterSDK, isFarcasterEnvironment } from '../utils/farcaster'
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

// Aave V3 Pool address on Base
const AAVE_V3_POOL_ADDRESS = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5'

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

// Get Farcaster wallet client with proper error handling
async function getFarcasterWalletClient() {
  try {
    // Get the authenticated address
    const address = await getAuthenticatedAddress()
    
    if (!address) {
      throw new Error('No authenticated address found')
    }

    // Create wallet client with the authenticated address
    return createWalletClient({
      chain: base,
      transport: http(),
      account: address as `0x${string}`,
    })
  } catch (error) {
    console.error('Failed to create Farcaster wallet client:', error)
    throw new Error(`Failed to initialize wallet: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Create public client for reading
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

// Execute Aave V3 transaction
async function executeAaveTransaction(params: TransactionParams): Promise<TransactionResult> {
  const { token, amount, action } = params
  
  try {
    // Get Farcaster wallet client
    const walletClient = await getFarcasterWalletClient()
    const userAddress = await getAuthenticatedAddress()
    
    if (!userAddress) {
      throw new Error('No authenticated address found')
    }

    const tokenAddress = token.address as `0x${string}`
    const amountWei = parseUnits(amount, token.decimals || 18)
    const fee = calculateTransactionFee(amount)

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
