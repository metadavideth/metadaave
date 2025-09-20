import { useWallet } from "../contexts/WalletContext"
import { useTokensWithBalances } from "../hooks/useTokenBalances"
import { usePortfolioData } from "../hooks/usePortfolioData"

export function Dashboard() {
  const { farcasterWalletAddress, chainId } = useWallet()
  const { tokens, isLoading: tokensLoading, error: tokensError } = useTokensWithBalances(farcasterWalletAddress, chainId)
  const { data: portfolioData, isLoading: portfolioLoading, error: portfolioError } = usePortfolioData()
  
  // Use real data if available, otherwise show loading or zero values
  const dashboardData = portfolioData || {
    totalSupplied: "0.00",
    totalBorrowed: "0.00",
    healthFactor: 0,
    netAPY: "0.00%",
    yieldEstimate: "0.00",
    utilization: 0,
    ltv: 0,
    positions: 0,
    isLoading: false,
    error: null
  }
  
  const isLoading = tokensLoading || portfolioLoading
  const error = tokensError || portfolioError

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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-card-foreground">Portfolio Overview</h2>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-3 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Supply & Borrow Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Total Supplied</div>
            <div className="text-lg font-semibold text-green-500">
              {isLoading ? '...' : `$${dashboardData.totalSupplied}`}
            </div>
          </div>

          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Total Borrowed</div>
            <div className="text-lg font-semibold text-blue-400">
              {isLoading ? '...' : `$${dashboardData.totalBorrowed}`}
            </div>
          </div>
        </div>

        {/* Health Factor */}
        <div className={`rounded-lg p-3 border ${dashboardData.healthFactor > 0 ? getHealthFactorBg(dashboardData.healthFactor) : 'bg-gray-600 border-gray-500'}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-white/80 mb-1">Health Factor</div>
              <div className={`text-lg font-semibold ${dashboardData.healthFactor > 0 ? getHealthFactorTextColor(dashboardData.healthFactor) : 'text-white'}`}>
                {isLoading ? '...' : dashboardData.healthFactor > 0 ? dashboardData.healthFactor.toFixed(2) : 'No Position'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/80">Status</div>
              <div className={`text-sm font-medium ${dashboardData.healthFactor > 0 ? getHealthFactorTextColor(dashboardData.healthFactor) : 'text-white'}`}>
                {isLoading ? '...' : 
                  dashboardData.healthFactor === 0 ? 'No Position' :
                  dashboardData.healthFactor > 1.5 ? "Safe" : 
                  dashboardData.healthFactor < 1.1 ? "At Risk" : "Caution"}
              </div>
            </div>
          </div>

          {dashboardData.healthFactor > 0 && dashboardData.healthFactor < 1.5 && (
            <div className="mt-2 text-xs text-white/80">
              {dashboardData.healthFactor < 1.1
                ? "Your position may be liquidated. Consider repaying debt or supplying more collateral."
                : "Monitor your health factor closely. Consider managing your position."}
            </div>
          )}
          
          {dashboardData.healthFactor === 0 && !isLoading && (
            <div className="mt-2 text-xs text-white/80">
              Start by supplying assets to Aave to begin earning yield and borrowing against your collateral.
            </div>
          )}
        </div>

        {/* Yield Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Net APY</div>
            <div className="text-lg font-semibold text-primary">
              {isLoading ? '...' : dashboardData.netAPY}
            </div>
          </div>

          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Est. Monthly Yield</div>
            <div className="text-lg font-semibold text-green-500">
              {isLoading ? '...' : `$${dashboardData.yieldEstimate}`}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground mb-2">Quick Stats</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Utilization</div>
              <div className="text-sm font-medium text-card-foreground">
                {isLoading ? '...' : `${dashboardData.utilization}%`}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">LTV</div>
              <div className="text-sm font-medium text-card-foreground">
                {isLoading ? '...' : `${dashboardData.ltv}%`}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Positions</div>
              <div className="text-sm font-medium text-card-foreground">
                {isLoading ? '...' : dashboardData.positions}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
