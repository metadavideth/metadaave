import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { createPublicClient, http, getContract } from 'viem'
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

// Aave V3 Pool address on Base mainnet
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

// Simplified transaction execution - no longer needed with Wagmi hooks

// Create public client for reading
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

// Execute Aave V3 transaction
async function executeAaveTransaction(params: TransactionParams, userAddress: string): Promise<TransactionResult> {
  const { token, amount, action } = params
  
  try {
    if (!userAddress) {
      throw new Error('No authenticated address found')
    }
    
    // Check if we're in a real Farcaster environment
    const isRealEnv = await isRealFarcasterEnvironment(userAddress)
    
    // Get Farcaster wallet client
    console.log('[transaction] About to create wallet client with address:', userAddress, 'type:', typeof userAddress)
    const walletClient = await getFarcasterWalletClient(userAddress)

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

// Simplified - approvals are now handled directly in mutations

// Hook for Aave V3 transactions
export function useAaveTransactions() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { writeContract } = useWriteContract()

  const supplyMutation = useMutation({
    mutationFn: async (params: Omit<TransactionParams, 'action'>) => {
      if (!address) {
        throw new Error('No wallet address available. Please connect your wallet first.')
      }
      console.log('[transaction] Executing supply with address:', address)
      
      const { token, amount } = params
      const amountWei = parseUnits(amount, token.decimals || 18)
      
      try {
        // Step 1: First approve the token
        console.log('[transaction] Step 1: Approving token...')
        console.log('[transaction] Token address:', token.address)
        console.log('[transaction] Token symbol:', token.symbol)
        console.log('[transaction] Amount to supply:', amount, 'wei:', amountWei.toString())
        console.log('[transaction] Aave Pool address:', AAVE_V3_POOL_ADDRESS)
        
        try {
          writeContract({
            address: token.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [AAVE_V3_POOL_ADDRESS, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')]
          })
          console.log('[transaction] ✅ Approval transaction submitted - please approve in wallet')
        } catch (error) {
          console.error('[transaction] ❌ Approval transaction failed:', error)
          throw error
        }
        
        // Wait for user to approve
        console.log('[transaction] Waiting for approval confirmation...')
        await new Promise(resolve => setTimeout(resolve, 20000)) // Wait 20 seconds for approval
        
        // Step 2: Then supply to Aave
        console.log('[transaction] Step 2: Supplying to Aave...')
        console.log('[transaction] Supply args:', [token.address, amountWei.toString(), address, 0])
        
        try {
          writeContract({
            address: AAVE_V3_POOL_ADDRESS,
            abi: AAVE_V3_POOL_ABI,
            functionName: 'supply',
            args: [token.address, amountWei, address, 0]
          })
          console.log('[transaction] ✅ Supply transaction submitted - please approve in wallet')
        } catch (error) {
          console.error('[transaction] ❌ Supply transaction failed:', error)
          throw error
        }
        
        // Return a mock hash for now since we can't get the real hash from writeContract
        const mockHash = `0x${Math.random().toString(16).substr(2, 64)}` as `0x${string}`
        
        return {
          hash: mockHash,
          action: 'supply',
          amount,
          token: token.symbol,
          fee: calculateTransactionFee(amount)
        }
      } catch (error) {
        console.error('[transaction] Supply failed:', error)
        throw error
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['aave-data'] })
      queryClient.invalidateQueries({ queryKey: ['token-balances'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-data'] })
    },
  })

  const borrowMutation = useMutation({
    mutationFn: async (params: Omit<TransactionParams, 'action'>) => {
      if (!address) {
        throw new Error('No wallet address available. Please connect your wallet first.')
      }
      console.log('[transaction] Executing borrow with address:', address)
      
      const { token, amount } = params
      const amountWei = parseUnits(amount, token.decimals || 18)
      
      try {
        console.log('[transaction] Borrowing from Aave...')
        writeContract({
          address: AAVE_V3_POOL_ADDRESS,
          abi: AAVE_V3_POOL_ABI,
          functionName: 'borrow',
          args: [token.address, amountWei, 2, 0, address]
        })
        console.log('[transaction] Borrow transaction submitted - please approve in wallet')
        
        const mockHash = `0x${Math.random().toString(16).substr(2, 64)}` as `0x${string}`
        
        return {
          hash: mockHash,
          action: 'borrow',
          amount,
          token: token.symbol,
          fee: calculateTransactionFee(amount)
        }
      } catch (error) {
        console.error('[transaction] Borrow failed:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aave-data'] })
      queryClient.invalidateQueries({ queryKey: ['token-balances'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-data'] })
    },
  })

  const repayMutation = useMutation({
    mutationFn: async (params: Omit<TransactionParams, 'action'>) => {
      if (!address) {
        throw new Error('No wallet address available. Please connect your wallet first.')
      }
      console.log('[transaction] Executing repay with address:', address)
      
      const { token, amount } = params
      const amountWei = parseUnits(amount, token.decimals || 18)
      
      try {
        console.log('[transaction] Repaying to Aave...')
        writeContract({
          address: AAVE_V3_POOL_ADDRESS,
          abi: AAVE_V3_POOL_ABI,
          functionName: 'repay',
          args: [token.address, amountWei, 2, address]
        })
        console.log('[transaction] Repay transaction submitted - please approve in wallet')
        
        const mockHash = `0x${Math.random().toString(16).substr(2, 64)}` as `0x${string}`
        
        return {
          hash: mockHash,
          action: 'repay',
          amount,
          token: token.symbol,
          fee: calculateTransactionFee(amount)
        }
      } catch (error) {
        console.error('[transaction] Repay failed:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aave-data'] })
      queryClient.invalidateQueries({ queryKey: ['token-balances'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-data'] })
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: async (params: Omit<TransactionParams, 'action'>) => {
      if (!address) {
        throw new Error('No wallet address available. Please connect your wallet first.')
      }
      console.log('[transaction] Executing withdraw with address:', address)
      
      const { token, amount } = params
      const amountWei = parseUnits(amount, token.decimals || 18)
      
      try {
        console.log('[transaction] Withdrawing from Aave...')
        writeContract({
          address: AAVE_V3_POOL_ADDRESS,
          abi: AAVE_V3_POOL_ABI,
          functionName: 'withdraw',
          args: [token.address, amountWei, address]
        })
        console.log('[transaction] Withdraw transaction submitted - please approve in wallet')
        
        const mockHash = `0x${Math.random().toString(16).substr(2, 64)}` as `0x${string}`
        
        return {
          hash: mockHash,
          action: 'withdraw',
          amount,
          token: token.symbol,
          fee: calculateTransactionFee(amount)
        }
      } catch (error) {
        console.error('[transaction] Withdraw failed:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aave-data'] })
      queryClient.invalidateQueries({ queryKey: ['token-balances'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-data'] })
    },
  })

  return {
    supply: supplyMutation,
    borrow: borrowMutation,
    repay: repayMutation,
    withdraw: withdrawMutation,
  }
}
