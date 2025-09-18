import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { createWalletClient, createPublicClient, http, getContract } from 'viem'
import { base } from 'viem/chains'
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

// Get Farcaster wallet client
function getFarcasterWalletClient() {
  if (typeof window === 'undefined' || !(window as any).FarcasterMiniApp) {
    throw new Error('Farcaster SDK not available')
  }

  const sdk = (window as any).FarcasterMiniApp
  if (!sdk.actions?.getUserData) {
    throw new Error('Farcaster SDK not properly initialized')
  }

  // For now, we'll use a mock wallet client
  // In a real implementation, you'd integrate with the Farcaster wallet
  return createWalletClient({
    chain: base,
    transport: http(),
    account: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Mock address
  })
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
    // Get Farcaster wallet
    const walletClient = getFarcasterWalletClient()
    const userData = await (window as any).FarcasterMiniApp.actions.getUserData()
    
    if (!userData?.verifiedAddresses?.[0]) {
      throw new Error('No verified address found in Farcaster wallet')
    }

    const userAddress = userData.verifiedAddresses[0] as `0x${string}`
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
    const walletClient = getFarcasterWalletClient()
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
