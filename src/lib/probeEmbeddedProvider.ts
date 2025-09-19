type AnyProv = any;

function flagOf(p: AnyProv, k: string) {
  try { return !!p?.[k]; } catch { return false; }
}

export function probeEmbeddedProvider() {
  const w: any = window as any;
  const eth: AnyProv = w.ethereum;

  console.groupCollapsed("[probe] provider surface");
  console.log("[probe] inIframe", window.self !== window.top);
  console.log("[probe] farcaster keys", {
    has_farcaster: !!w.farcaster,
    has_warpcast: !!w.warpcast,
    has_walletProvider: !!w.walletProvider,
    has_farcaster_walletProvider: !!w?.farcaster?.walletProvider,
  });

  if (!eth) {
    console.warn("[probe] window.ethereum is undefined");
    console.groupEnd();
    return;
  }

  console.log("[probe] window.ethereum flags", {
    isMetaMask: flagOf(eth,"isMetaMask"),
    isPhantom: flagOf(eth,"isPhantom"),
    isCoinbaseWallet: flagOf(eth,"isCoinbaseWallet"),
    isBraveWallet: flagOf(eth,"isBraveWallet"),
    providerName: eth?.providerName,
    has_providers_array: Array.isArray(eth?.providers) ? eth.providers.length : false,
  });

  const list: AnyProv[] = Array.isArray(eth?.providers) ? eth.providers : [eth];
  list.forEach((p, i) => {
    console.log(`[probe] provider[${i}] flags`, {
      isMetaMask: flagOf(p,"isMetaMask"),
      isPhantom: flagOf(p,"isPhantom"),
      isCoinbaseWallet: flagOf(p,"isCoinbaseWallet"),
      isBraveWallet: flagOf(p,"isBraveWallet"),
      isWarpcastEmbedded: flagOf(p,"isWarpcastEmbedded"),
      isFarcasterEmbedded: flagOf(p,"isFarcasterEmbedded"),
      isPrivyEmbedded: flagOf(p,"isPrivyEmbedded"),
      providerName: p?.providerName,
      has_request: typeof p?.request === "function",
    });
  });
  console.groupEnd();
}
