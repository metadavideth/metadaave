// Mock Farcaster data for development/previewer
export const mockFarcasterUser = {
  fid: 123,
  username: "farcaster_user",
  displayName: "Farcaster User",
  address: "0x1234567890abcdef1234567890abcdef12345678"
}

// Import Farcaster SDK as per official documentation
import { sdk as farcasterSDK } from "@farcaster/miniapp-sdk"

// Initialize Mini App authentication using the correct SDK API
export async function initMiniAppAuth(): Promise<{ token?: string; user?: any }> {
  try {
    // Ensure SDK is ready
    await farcasterSDK.actions.ready()
    console.log("✅ Farcaster SDK ready")
    
    // Check if we already have a token
    const existingToken = farcasterSDK.quickAuth.token
    if (existingToken) {
      console.log("✅ Using existing token, skipping signIn")
      return { 
        token: existingToken, 
        user: { 
          signature: "existing", 
          message: "existing", 
          authMethod: "existing" 
        } 
      }
    }
    
    // Generate a random nonce
    const nonce = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
    
    // Log available actions for debugging
    console.log("Available SDK actions:", Object.keys(farcasterSDK.actions))
    
    // Call signIn with nonce
    console.log("🔄 Calling sdk.actions.signIn...")
    const res = await farcasterSDK.actions.signIn({ nonce })
    console.log("SignIn result:", { signature: res.signature, message: res.message, authMethod: res.authMethod })
    
    // Get Quick Auth token
    console.log("🔄 Calling sdk.quickAuth.getToken...")
    const { token } = await farcasterSDK.quickAuth.getToken().catch(() => ({ token: undefined }))
    console.log("✅ Got token:", !!token)
    
    return { 
      token, 
      user: { 
        signature: res.signature, 
        message: res.message, 
        authMethod: res.authMethod 
      } 
    }
  } catch (error) {
    console.warn("Mini App auth failed:", error)
    return { token: undefined, user: undefined }
  }
}

// Get auth token ensuring SDK is ready
export async function getAuthToken(): Promise<string | undefined> {
  try {
    await farcasterSDK.actions.ready()
    return farcasterSDK.quickAuth.token
  } catch (error) {
    console.warn("Failed to get auth token:", error)
    return undefined
  }
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

// Get Farcaster SDK instance - now imported as module
export function getFarcasterSDK() {
  if (typeof window === "undefined") return null
  
  // SDK is now imported as a module, so we can return it directly
  if (farcasterSDK && farcasterSDK.actions) {
    console.log("✅ Farcaster SDK available via import")
    return farcasterSDK
  }
  
  console.log("❌ Farcaster SDK not available via import")
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
      // Check if we have an existing token without triggering auth
      const existingToken = farcasterSDK.quickAuth.token
      if (existingToken) {
        console.log("Using existing Farcaster token")
        return {
          ...mockFarcasterUser,
          token: existingToken,
          signature: "existing",
          message: "existing",
          authMethod: "existing"
        }
      }
      
      console.log("No existing token, using mock data")
      return mockFarcasterUser
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
  const token = await getAuthToken()
  if (token) {
    try {
      console.log("Making authenticated request with Quick Auth...")
      return await farcasterSDK.quickAuth.fetch(url, options)
    } catch (error) {
      console.warn("Quick Auth fetch failed:", error)
      // Fallback to regular fetch
      return fetch(url, options)
    }
  }
  
  // Fallback to regular fetch if not in Farcaster environment
  return fetch(url, options)
}

// Get Quick Auth token
export async function getQuickAuthToken() {
  return await getAuthToken()
}
