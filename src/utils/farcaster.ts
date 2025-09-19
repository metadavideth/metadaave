// Mock Farcaster data for development/previewer
export const mockFarcasterUser = {
  fid: 123,
  username: "farcaster_user",
  displayName: "Farcaster User",
  address: "0x1234567890abcdef1234567890abcdef12345678"
}

// Import Farcaster SDK as per official documentation
import { sdk as farcasterSDK } from "@farcaster/miniapp-sdk"
import { makeSiweNonce, sanitizeNonce } from './auth'

// Patch sdk.actions.signIn to guarantee an alphanumeric nonce
if (farcasterSDK?.actions?.signIn && !(farcasterSDK as any).__noncePatched) {
  const originalSignIn = farcasterSDK.actions.signIn
  farcasterSDK.actions.signIn = async function patchedSignIn(args: any = {}) {
    const supplied = sanitizeNonce(args.nonce)
    const finalNonce = supplied || makeSiweNonce(16)
    const patched = { ...args, nonce: finalNonce }
    console.log('[monkey] signIn args AFTER:', patched, 'alnum?', /^[a-z0-9]+$/i.test(finalNonce))
    return originalSignIn.call(farcasterSDK.actions, patched)
  }
  ;(farcasterSDK as any).__noncePatched = true
  console.log('[monkey] Farcaster signIn patched (nonce enforced)')
}

// Initialize Mini App authentication using the correct SDK API
export async function initMiniAppAuth(): Promise<{ token?: string; user?: any }> {
  try {
    console.log('[auth] inIframe', window.top !== window.self);
    console.log('[auth] sdk.version', farcasterSDK?.version);
    console.log('[auth] actions', Object.keys(farcasterSDK?.actions || {}));

    console.log('[auth] pre token', farcasterSDK.quickAuth.token);
    await farcasterSDK.actions.ready();
    console.log('[auth] ready:ok');


    const pre = farcasterSDK.quickAuth.token;
    console.log('[auth] preexisting token', pre);

    let token = pre;
    if (!token) {
      // Generate and validate nonce
      const nonce = makeSiweNonce(16)
      console.log('[auth] nonce (local):', nonce, 'alnum?', /^[a-z0-9]+$/i.test(nonce))
      
      // Call sdk.actions.signIn({ nonce }) unconditionally when user clicks Connect
      const res = await farcasterSDK.actions.signIn({ nonce })
      console.log('[auth] signIn result', res);
      
      // Immediately call await sdk.quickAuth.getToken() and treat a truthy token as authenticated
      const got = await farcasterSDK.quickAuth.getToken().catch(() => undefined);
      token = got?.token ?? got; // depending on SDK return shape
      console.log('[auth] token after signIn', token);
    }

    return { 
      token, 
      user: { 
        signature: "authenticated", 
        message: "authenticated", 
        authMethod: "farcaster" 
      } 
    }
  } catch (error) {
    console.warn("Mini App auth failed:", error)
    // Only fall back to mock if the user explicitly cancels sign-in
    if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
      console.log('[auth] user cancelled');
      return { token: undefined, user: undefined }
    }
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
  
  // Safer check: SDK has ready method and we're in iframe
  const isFarcasterEnv = !!farcasterSDK?.actions?.ready && window.top !== window.self
  
  console.log("Farcaster environment detection:", {
    hasSDKReady: !!farcasterSDK?.actions?.ready,
    isInIframe: window.top !== window.self,
    isFarcasterEnv,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    search: window.location.search
  })
  
  return isFarcasterEnv
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

// Get user data from Farcaster SDK or return undefined
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
      
      // No token, return undefined to keep showing Connect button
      return undefined
    }
    
    // Not in Farcaster environment, return undefined
    return undefined
  } catch (error) {
    console.warn("Error getting Farcaster user data:", error)
    return undefined
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
