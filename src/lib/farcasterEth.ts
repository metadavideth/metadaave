type AnySdk = any;

export type EthRequest = { method: string; params?: any[] };

export interface Eip1193 {
  request: (args: EthRequest) => Promise<any>;
}

function withTimeout<T>(p: Promise<T>, ms = 30_000, label = "eth.request"): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[timeout] ${label} exceeded ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

function isExtensionLike(p: any) {
  return !!(p?.isMetaMask || p?.isCoinbaseWallet || p?.isBraveWallet || p?.isPhantom);
}

/**
 * Attempts to find an embedded (non-extension) EIP-1193 provider when bridge APIs are missing.
 * We deliberately check known globals some hosts expose.
 */
function findEmbeddedGlobalProvider(): any | null {
  const candidates: any[] = [
    // explicit host handles people commonly see
    (globalThis as any).walletProvider,
    (globalThis as any).farcaster?.walletProvider,
    (globalThis as any).warpcast?.walletProvider, // legacy naming in some builds
    (globalThis as any).privy?.provider,
    // some hosts stash the provider directly on farcaster / privy
    (globalThis as any).farcaster?.provider,
    (globalThis as any).privyProvider,
    // last resort: check ethereum.providers[] for a non-extension, non-null request()
    ...(Array.isArray((globalThis as any).ethereum?.providers)
      ? (globalThis as any).ethereum.providers
      : []),
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (typeof p?.request === "function" && !isExtensionLike(p)) return p;
    } catch (_) {}
  }
  return null;
}

/**
 * Build an EIP-1193-like provider that prefers the Farcaster bridge,
 * but can fall back to a host-exposed embedded provider object.
 */
export function makeSdkEthProvider(sdk: AnySdk): Eip1193 {
  const a = sdk?.actions ?? {};
  const hasV2 = typeof a.ethProviderRequestV2 === "function";
  const hasV1 = typeof a.ethProviderRequest === "function";

  let bridge: ((req: EthRequest) => Promise<any>) | null = null;

  if (hasV2) {
    bridge = (req) => a.ethProviderRequestV2(req);
  } else if (hasV1) {
    bridge = (req) => a.ethProviderRequest(req.method as any, req.params ?? []);
  } else {
    // No bridge in this surface — try an injected embedded provider (still NOT extensions).
    const embedded = findEmbeddedGlobalProvider();
    if (embedded) {
      console.warn("[fc-eth] using embedded global provider (no bridge available)");
      return {
        async request({ method, params }: EthRequest) {
          console.log("[fc-eth:g] ->", method, params ?? []);
          const res = await withTimeout(embedded.request({ method, params }), 30_000, `eth.${method}`);
          console.log("[fc-eth:g] <-", method, res);
          return res;
        },
      };
    }

    // Nothing usable — print strong diagnostics to help you and future-me.
    console.error("[fc-eth] sdk.actions keys:", Object.keys(a || {}));
    console.error("[fc-eth] inIframe:", window.self !== window.top);
    console.error("[fc-eth] host:", location.host);
    throw new Error("Farcaster SDK missing ethProviderRequest API and no embedded provider found.");
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