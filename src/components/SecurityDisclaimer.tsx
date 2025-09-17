"use client"

import { useState } from "react"

export function SecurityDisclaimer() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="card border-yellow-700/50 bg-card">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-orange-600 mb-1">Security Notice</h3>
          <p className="text-xs text-gray-700 mb-3">
            DeFi protocols involve financial risks. Always do your own research (DYOR) before transacting.
          </p>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-orange-600 hover:text-orange-700 mb-3"
          >
            {isExpanded ? "Show Less" : "Read More"} →
          </button>

          {isExpanded && (
            <div className="space-y-3 text-xs text-gray-700">
              <div>
                <h4 className="font-medium text-orange-600 mb-1">Key Risks:</h4>
                <ul className="space-y-1 ml-3">
                  <li>• Smart contract vulnerabilities</li>
                  <li>• Liquidation risk for borrowed positions</li>
                  <li>• Market volatility and impermanent loss</li>
                  <li>• Protocol governance changes</li>
                  <li>• Network congestion and gas fees</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-orange-600 mb-1">Best Practices:</h4>
                <ul className="space-y-1 ml-3">
                  <li>• Never invest more than you can afford to lose</li>
                  <li>• Monitor your health factor regularly</li>
                  <li>• Keep emergency funds for liquidation protection</li>
                  <li>• Understand the protocol mechanics</li>
                  <li>• Use hardware wallets for large amounts</li>
                </ul>
              </div>
            </div>
          )}

          {/* Security Tools */}
          <div className="flex flex-wrap gap-2 mt-4">
            <a
              href="https://revoke.cash"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-xs bg-background-secondary hover:bg-background border border-gray-600 rounded-md px-2 py-1 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>Revoke Approvals</span>
            </a>

            <a
              href="https://docs.aave.com/risk/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-xs bg-background-secondary hover:bg-background border border-gray-600 rounded-md px-2 py-1 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>Risk Docs</span>
            </a>

            <a
              href="https://app.aave.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-xs bg-background-secondary hover:bg-background border border-gray-600 rounded-md px-2 py-1 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              <span>Official Aave</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
