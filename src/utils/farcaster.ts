// Mock Farcaster data for development/previewer
export const mockFarcasterUser = {
  fid: 123,
  username: "farcaster_user",
  displayName: "Farcaster User",
  address: "0x1234567890abcdef1234567890abcdef12345678"
}

// Check if we're in a Farcaster Mini App environment
export function isFarcasterEnvironment() {
  if (typeof window === "undefined") return false
  
  // Check for Farcaster SDK global
  if ((window as any).FarcasterMiniApp) {
    console.log("Farcaster SDK detected in global window")
    return true
  }
  
  // Check for Farcaster previewer or iframe context
  if (window.location.hostname.includes("farcaster") || 
      window.location.search.includes("farcaster") ||
      window.location.search.includes("preview") ||
      window.parent !== window) {
    console.log("Farcaster environment detected via URL/iframe")
    return true
  }
  
  // Always return true in production to attempt SDK usage
  // The SDK will handle authentication properly
  console.log("Attempting Farcaster environment detection for production")
  return true
}

// Get Farcaster SDK instance from global window object
export function getFarcasterSDK() {
  if (typeof window === "undefined") return null
  
  try {
    if ((window as any).FarcasterMiniApp) {
      return (window as any).FarcasterMiniApp
    }
  } catch (error) {
    console.warn("Failed to get Farcaster SDK:", error)
  }
  
  return null
}

// Get user data from Farcaster SDK or return mock data
export async function getFarcasterUserData() {
  try {
    const sdk = getFarcasterSDK()
    
    if (sdk && isFarcasterEnvironment()) {
      // We're in a Farcaster environment with SDK
      try {
        // Check if user is already authenticated
        const isAuthenticated = await sdk.actions.isAuthenticated()
        if (isAuthenticated) {
          // Get user data
          const userData = await sdk.actions.getUserData()
          if (userData) {
            return {
              username: userData.username || mockFarcasterUser.username,
              address: userData.address || userData.verifiedAddresses?.[0] || mockFarcasterUser.address,
              fid: userData.fid || mockFarcasterUser.fid,
              displayName: userData.displayName || mockFarcasterUser.displayName
            }
          }
        }
      } catch (sdkError) {
        console.warn("SDK authentication check error:", sdkError)
        // Fallback to mock data if SDK fails
        return mockFarcasterUser
      }
    }
    
    // Development mode or previewer - use mock data
    return mockFarcasterUser
  } catch (error) {
    console.warn("Error getting Farcaster user data:", error)
    return mockFarcasterUser
  }
}

// Get authenticated address for transactions
export async function getAuthenticatedAddress(): Promise<string> {
  const userData = await getFarcasterUserData()
  return userData.address
}
