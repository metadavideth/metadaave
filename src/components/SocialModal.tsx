"use client"

interface SocialModalProps {
  isOpen: boolean
  onClose: () => void
  action: string
  amount: string
  token: string
}

export function SocialModal({ isOpen, onClose, action, amount, token }: SocialModalProps) {
  if (!isOpen) return null

  const getActionEmoji = (action: string) => {
    switch (action) {
      case "supply":
        return "💰"
      case "borrow":
        return "📈"
      case "repay":
        return "✅"
      case "withdraw":
        return "💸"
      default:
        return "🌟"
    }
  }

  const getActionText = (action: string) => {
    switch (action) {
      case "supply":
        return "Supplied"
      case "borrow":
        return "Borrowed"
      case "repay":
        return "Repaid"
      case "withdraw":
        return "Withdrew"
      default:
        return "Transacted"
    }
  }

  const shareText = `${getActionEmoji(action)} ${getActionText(action)} ${amount} ${token} with metadaave! 🚀\n\nEarning yield on Base with Aave V3 💙`

  const handleShareToFarcaster = () => {
    // Create Farcaster share URL
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`
    window.open(farcasterUrl, "_blank")
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-gray-300 rounded-xl p-6 max-w-sm w-full shadow-lg">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">{getActionEmoji(action)}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Transaction Successful!</h3>
          <p className="text-gray-600 text-sm">
            {getActionText(action)} {amount} {token}
          </p>
        </div>

        {/* Transaction Details */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Action:</span>
              <span className="text-gray-900 capitalize font-medium">{action}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="text-gray-900 font-medium">
                {amount} {token}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Network:</span>
              <span className="text-gray-900 font-medium">Base</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="text-green-600 font-medium">Confirmed</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleShareToFarcaster}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>🟣</span>
            <span>Share to Farcaster</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
