export function assertNoExtensionProvider() {
  const g: any = globalThis as any;
  const eth = g.ethereum;

  // Allow inside Farcaster iframe when we tagged the provider (or heuristics say it's embedded)
  const embeddedOk =
    !!eth?.__embedded ||
    (!!eth && typeof eth.request === "function" &&
      // looks like embedded: not a known extension AND we're inside Farcaster iframe
      !eth.isMetaMask && !eth.isCoinbaseWallet && !eth.isBraveWallet && !eth.isPhantom &&
      (document.referrer.includes("wallet.farcaster.xyz") ||
       document.referrer.includes("client.farcaster.xyz") ||
       document.referrer.includes("wallet.warpcast.com") ||
       document.referrer.includes("client.warpcast.com")));

  if (embeddedOk) {
    console.log("[tripwire] embedded provider allowed (Farcaster iframe)");
    return;
  }

  const looksLikeExtension = !!(eth?.isMetaMask || eth?.isCoinbaseWallet || eth?.isBraveWallet || eth?.isPhantom);
  if (looksLikeExtension) {
    console.warn("[tripwire] Browser extension wallet detected. Mini App will refuse to use it.");
    throw new Error("Extension provider blocked");
  }
}