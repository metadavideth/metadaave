type AnySdk = any;

export type EthRequest = { method: string; params?: any[] };

export interface Eip1193 {
  request: (args: EthRequest) => Promise<any>;
}

/** Simple 30s timeout wrapper */
function withTimeout<T>(p: Promise<T>, ms = 30_000, label = "eth.request"): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[timeout] ${label} exceeded ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * Build an EIP-1193-like provider that *only* talks through the Farcaster Mini App bridge.
 * Never reads from window.ethereum, never triggers extensions.
 */
export function makeSdkEthProvider(sdk: AnySdk): Eip1193 {
  if (!sdk?.actions) throw new Error("Farcaster SDK not ready (no actions).");

  // Prefer v2 if present, else v1
  const bridge =
    typeof sdk.actions.ethProviderRequestV2 === "function"
      ? (req: EthRequest) => sdk.actions.ethProviderRequestV2(req)
      : typeof sdk.actions.ethProviderRequest === "function"
      ? (req: EthRequest) => sdk.actions.ethProviderRequest(req.method as any, req.params ?? [])
      : null;

  if (!bridge) throw new Error("Farcaster SDK missing ethProviderRequest API.");

  return {
    async request({ method, params }: EthRequest) {
      // Minimal logging for troubleshooting
      console.log("[fc-eth] ->", method, params ?? []);
      const res = await withTimeout(bridge({ method, params }), 30_000, `eth.${method}`);
      console.log("[fc-eth] <-", method, res);
      return res;
    },
  };
}
