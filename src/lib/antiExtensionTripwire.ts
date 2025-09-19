type AnySdk = any;

function inIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

function isFarcasterHostFromReferrer(): boolean {
  const ref = document.referrer || "";
  try {
    const host = new URL(ref).host;
    return (
      host.endsWith("wallet.farcaster.xyz") ||
      host.endsWith("client.farcaster.xyz") ||
      host.endsWith("wallet.warpcast.com") ||   // legacy
      host.endsWith("client.warpcast.com")      // legacy
    );
  } catch { return false; }
}

function looksLikeExtension(eth: any) {
  return !!(eth?.isMetaMask || eth?.isCoinbaseWallet || eth?.isBraveWallet || eth?.isPhantom);
}

export function assertNoExtensionProvider(opts?: { sdk?: AnySdk }) {
  const g: any = globalThis as any;
  const eth = g.ethereum;

  const farcasterEnv =
    inIframe() &&
    // either our referrer heuristic OR the actual Farcaster SDK is present
    (isFarcasterHostFromReferrer() || !!opts?.sdk?.actions?.signIn);

  // If the provider was tagged by our factory, treat as embedded
  const taggedEmbedded = !!eth?.__embedded;

  // Whitelist path: inside Farcaster iframe OR tagged embedded provider
  if (farcasterEnv || taggedEmbedded) {
    console.log("[tripwire] embedded provider allowed (Farcaster iframe/tag)");
    return; // do NOT throw
  }

  // Outside Farcaster: still block true extensions
  if (looksLikeExtension(eth)) {
    console.warn("[tripwire] Browser extension wallet detected. Blocking outside Farcaster.");
    throw new Error("Extension provider blocked");
  }

  // Unknown case: do not crash the app; just warn
  if (eth && typeof eth.request === "function") {
    console.warn("[tripwire] Non-tagged provider present outside Farcaster; continuing.");
  } else {
    console.log("[tripwire] No provider detected.");
  }
}