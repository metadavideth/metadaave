// Mock Farcaster data for development/previewer
export const mockFarcasterUser = {
  fid: 123,
  username: "farcaster_user",
  displayName: "Farcaster User",
  address: "0x1234567890abcdef1234567890abcdef12345678"
}

// Import Farcaster SDK as per official documentation
// Note: The SDK should be injected by Farcaster, not imported as a module
// import { sdk as farcasterSDK } from "@farcaster/miniapp-sdk"

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

// Get Farcaster SDK instance - should be injected by Farcaster
export function getFarcasterSDK() {
  if (typeof window === "undefined") return null
  
  // Debug: Log the actual SDK structure
  console.log("🔍 Debugging SDK structure:")
  console.log("window.FarcasterMiniApp:", (window as any).FarcasterMiniApp)
  console.log("window keys with 'farcaster':", Object.keys(window).filter(k => k.toLowerCase().includes('farcaster')))
  console.log("window keys with 'sdk':", Object.keys(window).filter(k => k.toLowerCase().includes('sdk')))
  console.log("All window keys:", Object.keys(window).slice(0, 20))
  
  // Check for SDK in various possible locations
  const possibleSDKs = [
    (window as any).FarcasterMiniApp,
    (window as any).farcaster,
    (window as any).Farcaster,
    (window as any).sdk,
    (window as any).SDK
  ]
  
  for (let i = 0; i < possibleSDKs.length; i++) {
    const sdk = possibleSDKs[i]
    if (sdk) {
      console.log(`✅ Found SDK at index ${i}:`, sdk)
      console.log("SDK type:", typeof sdk)
      console.log("SDK keys:", Object.keys(sdk))
      if (sdk.actions) {
        console.log("SDK.actions:", sdk.actions)
        console.log("SDK.actions keys:", Object.keys(sdk.actions))
      }
      return sdk
    }
  }
  
  console.log("❌ No SDK found in any expected location")
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
      if (attempts === 2 && !(window as any).FarcasterMiniApp) {
        console.log("Attempting to manually load Farcaster SDK...")
        
        // Try multiple CDN sources and versions
        const cdnUrls = [
          'https://cdn.jsdelivr.net/npm/@farcaster/miniapp-sdk@latest/dist/index.js',
          'https://unpkg.com/@farcaster/miniapp-sdk@1.0.0/dist/index.js',
          'https://unpkg.com/@farcaster/miniapp-sdk@0.1.0/dist/index.js',
          'https://unpkg.com/@farcaster/miniapp-sdk@latest/dist/index.js'
        ]
        
        let urlIndex = 0
        const tryNextUrl = () => {
          if (urlIndex >= cdnUrls.length) {
            console.log("All CDN URLs failed, trying direct injection...")
            // Try to inject a minimal SDK implementation
            const script = document.createElement('script')
            script.textContent = `
              // Minimal Farcaster SDK implementation for testing
              window.FarcasterMiniApp = {
                actions: {
                  ready: () => Promise.resolve(),
                  isAuthenticated: () => Promise.resolve(false),
                  getUserData: () => Promise.resolve(null),
                  authenticate: () => Promise.resolve({ success: false, error: 'SDK not available' }),
                  openSigner: () => Promise.resolve({ success: false, error: 'SDK not available' })
                }
              };
              console.log("Minimal Farcaster SDK injected");
            `
            document.head.appendChild(script)
            setTimeout(checkSDK, 100)
            return
          }
          
          const script = document.createElement('script')
          script.src = cdnUrls[urlIndex]
          script.onload = () => {
            console.log(`Successfully loaded Farcaster SDK from ${cdnUrls[urlIndex]}`)
            setTimeout(checkSDK, 100)
          }
          script.onerror = (error) => {
            console.error(`Failed to load from ${cdnUrls[urlIndex]}:`, error)
            urlIndex++
            tryNextUrl()
          }
          document.head.appendChild(script)
        }
        
        tryNextUrl()
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
    if (isFarcasterEnvironment()) {
      console.log("Attempting Farcaster Quick Auth...")
      
      try {
        // Check if SDK is available
        const currentSDK = getFarcasterSDK()
        if (!currentSDK) {
          console.log("Farcaster SDK not available")
          throw new Error("Farcaster SDK not available")
        }
        
        if (currentSDK && currentSDK.quickAuth) {
          console.log("Using Farcaster Quick Auth...")
          
          // Try to get a Quick Auth token
          const { token } = await currentSDK.quickAuth.getToken()
          console.log("Quick Auth token received:", !!token)
          
          if (token) {
            // Use the token to make an authenticated request to get user data
            // For now, we'll use mock data but with a real token
            console.log("Quick Auth successful, using mock user data with real token")
            return {
              ...mockFarcasterUser,
              token: token // Include the token for future use
            }
          }
        }
        
        // Fallback to traditional authentication if Quick Auth fails
        if (currentSDK && currentSDK.actions) {
          console.log("Falling back to traditional authentication...")
          console.log("currentSDK.actions:", currentSDK.actions)
          console.log("currentSDK.actions keys:", Object.keys(currentSDK.actions))
          
          if (currentSDK.actions.ready) {
            await currentSDK.actions.ready()
            console.log("Farcaster SDK ready")
          }
          
          if (currentSDK.actions.isAuthenticated) {
            console.log("Calling isAuthenticated...")
            const isAuthenticated = await currentSDK.actions.isAuthenticated()
            console.log("User authenticated:", isAuthenticated)
            
            if (isAuthenticated && currentSDK.actions.getUserData) {
              const userData = await currentSDK.actions.getUserData()
              console.log("User data received:", userData)
              
              if (userData) {
                return {
                  username: userData.username || mockFarcasterUser.username,
                  address: userData.address || userData.verifiedAddresses?.[0] || mockFarcasterUser.address,
                  fid: userData.fid || mockFarcasterUser.fid,
                  displayName: userData.displayName || mockFarcasterUser.displayName
                }
              }
            }
          }
        }
        
      } catch (sdkError) {
        console.warn("Farcaster authentication error:", sdkError)
        // Fallback to mock data if SDK fails
        return mockFarcasterUser
      }
    }
    
    // Development mode or previewer - use mock data
    console.log("Using mock data for development/previewer")
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

// Make authenticated requests using Quick Auth
export async function makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
  if (isFarcasterEnvironment()) {
    const sdk = getFarcasterSDK()
    if (sdk && sdk.quickAuth) {
      try {
        console.log("Making authenticated request with Quick Auth...")
        return await sdk.quickAuth.fetch(url, options)
      } catch (error) {
        console.warn("Quick Auth fetch failed:", error)
        // Fallback to regular fetch
        return fetch(url, options)
      }
    }
  }
  
  // Fallback to regular fetch if not in Farcaster environment
  return fetch(url, options)
}

// Get Quick Auth token
export async function getQuickAuthToken() {
  if (isFarcasterEnvironment()) {
    const sdk = getFarcasterSDK()
    if (sdk && sdk.quickAuth) {
      try {
        const { token } = await sdk.quickAuth.getToken()
        return token
      } catch (error) {
        console.warn("Failed to get Quick Auth token:", error)
        return null
      }
    }
  }
  return null
}
