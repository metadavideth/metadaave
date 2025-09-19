import React, { createContext, useContext, useState } from 'react'

interface WalletContextType {
  farcasterWalletAddress: string | undefined
  chainId: string | undefined
  setFarcasterWalletAddress: (address: string | undefined) => void
  setChainId: (chainId: string | undefined) => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [farcasterWalletAddress, setFarcasterWalletAddress] = useState<string | undefined>()
  const [chainId, setChainId] = useState<string | undefined>()

  return (
    <WalletContext.Provider value={{
      farcasterWalletAddress,
      chainId,
      setFarcasterWalletAddress,
      setChainId
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
