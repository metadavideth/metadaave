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
      console.log("Farcaster SDK found in window object")
      return (window as any).FarcasterMiniApp
    } else {
      console.log("Farcaster SDK not found in window object")
      console.log("Available window properties:", Object.keys(window).filter(key => key.toLowerCase().includes('farcaster')))
    }
  } catch (error) {
    console.warn("Failed to get Farcaster SDK:", error)
  }
  
  return null
}

// Wait for Farcaster SDK to be available
export async function waitForFarcasterSDK(timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const checkSDK = () => {
      const sdk = getFarcasterSDK()
      if (sdk) {
        console.log("Farcaster SDK loaded successfully")
        resolve(sdk)
        return
      }
      
      if (Date.now() - startTime > timeout) {
        console.warn("Farcaster SDK timeout - not loaded within", timeout, "ms")
        reject(new Error("Farcaster SDK not available"))
        return
      }
      
      // Check again in 100ms
      setTimeout(checkSDK, 100)
    }
    
    checkSDK()
  })
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
