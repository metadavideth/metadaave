import { useWallet } from "../contexts/WalletContext"
import { useTokensWithBalances } from "../hooks/useTokenBalances"

export function Dashboard() {
  const { farcasterWalletAddress, chainId } = useWallet()
  const { tokens, isLoading, error } = useTokensWithBalances(farcasterWalletAddress, chainId)
  // Mock data with realistic values
  const dashboardData = {
    totalSupplied: "8,450.32",
    totalBorrowed: "3,200.15",
    healthFactor: 2.45,
    netAPY: "2.85%",
    yieldEstimate: "241.20",
  }

  const getHealthFactorColor = (factor: number) => {
    if (factor > 1.5) return "text-green-500"
    if (factor < 1.1) return "text-red-500"
    return "text-yellow-500"
  }

  const getHealthFactorBg = (factor: number) => {
    if (factor > 1.5) return "bg-green-600 border-green-500"
    if (factor < 1.1) return "bg-red-600 border-red-500"
    return "bg-yellow-600 border-yellow-500"
  }

  const getHealthFactorTextColor = (factor: number) => {
    return "text-white"
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 text-card-foreground">Portfolio Overview</h2>

      <div className="space-y-4">
        {/* Supply & Borrow Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Total Supplied</div>
            <div className="text-lg font-semibold text-green-500">${dashboardData.totalSupplied}</div>
          </div>

          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Total Borrowed</div>
            <div className="text-lg font-semibold text-blue-400">${dashboardData.totalBorrowed}</div>
          </div>
        </div>

        {/* Health Factor */}
        <div className={`rounded-lg p-3 border ${getHealthFactorBg(dashboardData.healthFactor)}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-white/80 mb-1">Health Factor</div>
              <div className={`text-lg font-semibold ${getHealthFactorTextColor(dashboardData.healthFactor)}`}>
                {dashboardData.healthFactor.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/80">Status</div>
              <div className={`text-sm font-medium ${getHealthFactorTextColor(dashboardData.healthFactor)}`}>
                {dashboardData.healthFactor > 1.5 ? "Safe" : dashboardData.healthFactor < 1.1 ? "At Risk" : "Caution"}
              </div>
            </div>
          </div>

          {dashboardData.healthFactor < 1.5 && (
            <div className="mt-2 text-xs text-white/80">
              {dashboardData.healthFactor < 1.1
                ? "Your position may be liquidated. Consider repaying debt or supplying more collateral."
                : "Monitor your health factor closely. Consider managing your position."}
            </div>
          )}
        </div>

        {/* Yield Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Net APY</div>
            <div className="text-lg font-semibold text-primary">{dashboardData.netAPY}</div>
          </div>

          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Est. Monthly Yield</div>
            <div className="text-lg font-semibold text-green-500">${dashboardData.yieldEstimate}</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground mb-2">Quick Stats</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Utilization</div>
              <div className="text-sm font-medium text-card-foreground">65%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">LTV</div>
              <div className="text-sm font-medium text-card-foreground">45%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Positions</div>
              <div className="text-sm font-medium text-card-foreground">3</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
