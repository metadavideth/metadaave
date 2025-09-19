import { recoverMessageAddress, recoverTypedDataAddress } from "viem";

const VERIFY_MSG = "miniapp:verify";

// Lightweight timeout helper in case we don't have one already
async function withTimeout<T>(p: Promise<T>, ms: number, label = "op"): Promise<T> {
  let t: any;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        t = setTimeout(() => reject(new Error(`${label}: timeout after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(t);
  }
}

type Eip1193 = {
  request: (args: { method: string; params?: any[] | object }) => Promise<any>;
  // Some libs tag their providers:
  isWarpcastEmbedded?: boolean;
  isFarcasterEmbedded?: boolean;
  isPrivyEmbedded?: boolean;
  providerName?: string;
};

function looksLikeExtension(eth: any) {
  // Common extension fingerprints
  return !!(eth?.isMetaMask || eth?.isPhantom || eth?.isCoinbaseWallet || eth?.isBraveWallet);
}

async function getFarcasterProvider(): Promise<Eip1193> {
  const w = window as any;

  // 1) Prefer explicit embedded handles if present
  const explicitCandidates: any[] = [
    w?.farcaster?.walletProvider,
    w?.walletProvider,
    w?.warpcast?.walletProvider,
    w?.Privy?.getEmbeddedWalletProvider?.(),
    w?.privy?.provider,
  ].filter(Boolean);

  // 2) Also scan window.ethereum.providers[] for a non-extension provider
  const eth = (w as any).ethereum;
  const multi: any[] = Array.isArray(eth?.providers) ? eth.providers : [];
  if (eth && !multi.length) {
    // Some builds don't expose .providers; include eth as a last-chance candidate
    multi.push(eth);
  }

  // De-dupe while preserving order
  const seen = new Set<any>();
  const candidates: any[] = [...explicitCandidates, ...multi].filter(p => p && !seen.has(p) && seen.add(p));

  // Filter out known browser extensions
  const nonExtensions = candidates.filter(p => {
    const looksLikeExt =
      !!p?.isMetaMask || !!p?.isPhantom || !!p?.isCoinbaseWallet || !!p?.isBraveWallet;
    const hasRequest = typeof p?.request === "function";
    return hasRequest && !looksLikeExt;
  });

  // Prefer any with embedded fingerprints if available
  const preferred = nonExtensions.find(p =>
    p?.isWarpcastEmbedded || p?.isFarcasterEmbedded || p?.isPrivyEmbedded || p?.providerName === "privy-embedded"
  ) || nonExtensions[0];

  if (preferred) {
    console.log("[provider] Selected embedded (non-extension) provider", {
      isWarpcastEmbedded: !!preferred.isWarpcastEmbedded,
      isFarcasterEmbedded: !!preferred.isFarcasterEmbedded,
      isPrivyEmbedded: !!preferred.isPrivyEmbedded,
      providerName: preferred?.providerName,
    });
    return preferred as Eip1193;
  }

  // If we got here, everything we can see is an extension or unusable
  // Keep the hard fail to avoid Phantom/MetaMask hijack.
  throw new Error("Farcaster embedded wallet provider not found. Refusing to use browser extensions.");
}

export async function verifyFarcasterWallet() {
  const provider = await getFarcasterProvider();
  if (!provider) throw new Error("Farcaster Wallet provider not found");

  const anyWinEth = (window as any).ethereum;
  if (anyWinEth) {
    if (anyWinEth === (provider as any)) {
      // Extremely defensive: even if equal, refuse if it looks like an extension
      if ((anyWinEth as any).isMetaMask || (anyWinEth as any).isPhantom || (anyWinEth as any).isCoinbaseWallet) {
        throw new Error("Refusing to use browser extension provider for Mini App.");
      }
    }
  }

  const chainIdHex: string = await provider.request({ method: "eth_chainId" });
  const chainIdDec = Number(chainIdHex); // signTypedData_v4 domain.chainId prefers a number

  // DO NOT call eth_requestAccounts in Mini Apps; it may delegate to extensions.
  // The embedded provider should expose the active account via eth_accounts.
  let accounts: string[] = await provider.request({ method: "eth_accounts" });
  const addr = accounts?.[0];
  if (!addr) {
    throw new Error("Embedded Farcaster wallet has no active account yet (eth_accounts empty).");
  }

  console.log("[wallet] using embedded provider only (no window.ethereum fallbacks)");

  // 1) Try personal_sign first
  try {
    const sig = await withTimeout(
      provider.request({ method: "personal_sign", params: [VERIFY_MSG, addr] }),
      30_000,
      "personal_sign"
    );
    const rec = (await recoverMessageAddress({ message: VERIFY_MSG, signature: sig })).toLowerCase();
    if (rec !== addr.toLowerCase()) throw new Error("personal_sign: recovered address mismatch");
    console.log("[wallet] verify: personal_sign ok for", addr);
    return { address: addr.toLowerCase(), chainId: chainIdHex };
  } catch (e) {
    console.warn("[verify] personal_sign failed, falling back to typed-data:", e);
  }

  // 2) Typed-data fallback (EIP-712). Avoid BigInt in JSON.
  const tsSec = Math.floor(Date.now() / 1000);

  const types = {
    Verify: [
      { name: "purpose", type: "string" },
      { name: "app", type: "string" },
      { name: "ts", type: "uint256" },
    ],
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
    ],
  } as const;

  const domain = {
    name: "MetaDaave MiniApp",
    version: "1",
    chainId: chainIdDec,
  } as const;

  // IMPORTANT: strings in the object that is JSON.stringified for v4
  const messageForSign = {
    purpose: "verify",
    app: "metadaave.vercel.app",
    ts: tsSec.toString(),
  } as const;

  const typedDataForSign = {
    types,
    domain,
    primaryType: "Verify",
    message: messageForSign,
  };

  const sig712 = await withTimeout(
    provider.request({
      method: "eth_signTypedData_v4",
      params: [addr, JSON.stringify(typedDataForSign)],
    }),
    30_000,
    "eth_signTypedData_v4"
  );

  // For recovery (not JSON), we can use BigInt safely
  const messageForRecover = {
    ...messageForSign,
    ts: BigInt(tsSec),
  } as const;

  const rec712 = (await recoverTypedDataAddress({
    domain,
    types,
    primaryType: "Verify",
    message: messageForRecover,
    signature: sig712,
  })).toLowerCase();

  if (rec712 !== addr.toLowerCase()) {
    throw new Error("typed-data: recovered address mismatch");
  }

  console.log("[wallet] verify: typed-data ok for", addr);
  return { address: addr.toLowerCase(), chainId: chainIdHex };
}