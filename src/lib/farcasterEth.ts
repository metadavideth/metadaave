type AnySdk = any;

export type EthRequest = { method: string; params?: any[] };
export interface Eip1193 { request: (args: EthRequest) => Promise<any>; }

function withTimeout<T>(p: Promise<T>, ms = 30_000, label = "eth.request"): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[timeout] ${label} exceeded ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); },
           (e) => { clearTimeout(t); reject(e); });
  });
}

// Known extension markers
function isExtensionLike(p: any) {
  return !!(p?.isMetaMask || p?.isCoinbaseWallet || p?.isBraveWallet || p?.isPhantom);
}

// Heuristic: are we running as a Farcaster Mini App?
function isInFarcasterIframe(): boolean {
  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  if (!inIframe) return false;
  const ref = document.referrer || "";
  // Accept wallet hosts (Farcaster renamed Warpcast → Farcaster, but both may appear)
  try {
    const host = new URL(ref).host;
    if (host.endsWith("wallet.farcaster.xyz")) return true;
    if (host.endsWith("client.farcaster.xyz")) return true;
    if (host.endsWith("wallet.warpcast.com")) return true;   // legacy
    if (host.endsWith("client.warpcast.com")) return true;   // legacy
  } catch {}
  return false;
}

// Try to locate an embedded, non-extension provider.
function findEmbeddedGlobalProvider(): any | null {
  const g = globalThis as any;

  // 1) Common globals some hosts expose explicitly
  const explicit = [
    g.walletProvider,
    g.farcaster?.walletProvider,
    g.warpcast?.walletProvider,
    g.privy?.provider,
    g.farcaster?.provider,
    g.privyProvider,
  ].filter(Boolean);

  for (const p of explicit) {
    try { if (typeof p?.request === "function" && !isExtensionLike(p)) return p; } catch {}
  }

  // 2) Multiple injected EVM providers array (rare in this surface, but check)
  const maybeArray = Array.isArray(g.ethereum?.providers) ? g.ethereum.providers : [];
  for (const p of maybeArray) {
    try { if (typeof p?.request === "function" && !isExtensionLike(p)) return p; } catch {}
  }

  // 3) **Single** injected provider on window.ethereum
  // Only accept this path when we are inside the Farcaster iframe AND it doesn't look like an extension.
  const hasSdk = !!(g.__farcasterSdk?.actions?.signIn); // if you stash sdk globally
  if (isInFarcasterIframe() || hasSdk) {
    const eth = g.ethereum;
    if (eth && typeof eth.request === "function" && !isExtensionLike(eth)) {
      // Optional: tag for downstream logic so tripwires can whitelist it
      try { (eth as any).__embedded = "farcaster-iframe"; } catch {}
      return eth;
    }
  }

  return null;
}

export function makeSdkEthProvider(sdk: AnySdk): Eip1193 {
  const a = sdk?.actions ?? {};
  const hasV2 = typeof a.ethProviderRequestV2 === "function";
  const hasV1 = typeof a.ethProviderRequest === "function";

  if (!hasV1 && !hasV2) {
    throw new Error("Farcaster ETH bridge not available in this environment.");
  }

  let bridge: ((req: EthRequest) => Promise<any>) | null = null;
  if (hasV2) {
    bridge = (req) => a.ethProviderRequestV2(req);
  } else if (hasV1) {
    bridge = (req) => a.ethProviderRequest(req.method as any, req.params ?? []);
  }

  return {
    async request({ method, params }: EthRequest) {
      console.log("[fc-eth] ->", method, params ?? []);
      const res = await withTimeout(bridge!({ method, params }), 30_000, `eth.${method}`);
      console.log("[fc-eth] <-", method, res);
      return res;
    },
  };
}