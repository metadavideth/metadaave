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
  
  console.log("Checking Farcaster environment...")
  console.log("Environment details:", {
    hostname: window.location.hostname,
    isIframe: window.self !== window.top,
    userAgent: navigator.userAgent,
    referrer: document.referrer,
    hasFarcasterSDK: !!(window as any).FarcasterMiniApp,
    parentWindow: window.parent !== window,
    searchParams: window.location.search
  })
  
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
  
  // Check if we're in an iframe (common for mini apps)
  if (window.self !== window.top) {
    console.log("Detected iframe context - likely Farcaster mini app")
    return true
  }
  
  // Check for Farcaster-specific user agent or referrer
  if (navigator.userAgent.includes("farcaster") || 
      document.referrer.includes("farcaster") ||
      document.referrer.includes("warpcast")) {
    console.log("Farcaster environment detected via user agent/referrer")
    return true
  }
  
  // If we're in an iframe or have any Farcaster indicators, assume we're in Farcaster
  if (window.self !== window.top || 
      window.location.search.includes("farcaster") ||
      window.location.search.includes("preview") ||
      document.referrer.includes("farcaster") ||
      document.referrer.includes("warpcast")) {
    console.log("Farcaster environment detected - will attempt SDK usage")
    return true
  }
  
  console.log("Not in Farcaster environment - SDK may not be available")
  return false
}

// Get Farcaster SDK instance from global window object
export function getFarcasterSDK() {
  if (typeof window === "undefined") return null
  
  try {
    console.log("Checking for Farcaster SDK...")
    console.log("Window object keys:", Object.keys(window).slice(0, 20)) // First 20 keys
    console.log("FarcasterMiniApp in window:", !!(window as any).FarcasterMiniApp)
    console.log("FarcasterMiniApp type:", typeof (window as any).FarcasterMiniApp)
    
    if ((window as any).FarcasterMiniApp) {
      console.log("Farcaster SDK found in window object")
      console.log("SDK structure:", Object.keys((window as any).FarcasterMiniApp))
      return (window as any).FarcasterMiniApp
    } else {
      console.log("Farcaster SDK not found in window object")
      console.log("Available window properties with 'farcaster':", Object.keys(window).filter(key => key.toLowerCase().includes('farcaster')))
      console.log("Available window properties with 'Farcaster':", Object.keys(window).filter(key => key.includes('Farcaster')))
      
      // Check if it might be under a different name
      const possibleNames = ['FarcasterMiniApp', 'farcasterMiniApp', 'Farcaster', 'farcaster']
      for (const name of possibleNames) {
        if ((window as any)[name]) {
          console.log(`Found potential SDK under name: ${name}`, (window as any)[name])
        }
      }
    }
  } catch (error) {
    console.warn("Failed to get Farcaster SDK:", error)
  }
  
  return null
}

// Wait for Farcaster SDK to be available
export async function waitForFarcasterSDK(timeout = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    let attempts = 0
    
    const checkSDK = () => {
      attempts++
      console.log(`SDK check attempt ${attempts}...`)
      
      const sdk = getFarcasterSDK()
      if (sdk) {
        console.log("Farcaster SDK loaded successfully after", attempts, "attempts")
        resolve(sdk)
        return
      }
      
      // Try to manually load the SDK if it's not available
      if (attempts === 5 && !(window as any).FarcasterMiniApp) {
        console.log("Attempting to manually load Farcaster SDK...")
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/@farcaster/miniapp-sdk@latest/dist/index.js'
        script.onload = () => {
          console.log("Manual SDK load completed")
          setTimeout(checkSDK, 100)
        }
        script.onerror = () => {
          console.error("Manual SDK load failed")
          setTimeout(checkSDK, 100)
        }
        document.head.appendChild(script)
        return
      }
      
      if (Date.now() - startTime > timeout) {
        console.warn("Farcaster SDK timeout - not loaded within", timeout, "ms after", attempts, "attempts")
        console.log("Final window state:", {
          hasFarcasterMiniApp: !!(window as any).FarcasterMiniApp,
          windowKeys: Object.keys(window).slice(0, 10),
          allWindowKeys: Object.keys(window).length,
          scripts: Array.from(document.scripts).map(s => s.src)
        })
        reject(new Error("Farcaster SDK not available"))
        return
      }
      
      // Check again in 200ms
      setTimeout(checkSDK, 200)
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
