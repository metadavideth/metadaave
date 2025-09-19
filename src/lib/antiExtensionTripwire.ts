export function tripwireAgainstExtensions() {
  const eth: any = (window as any).ethereum;
  if (!eth) return;
  if (eth.isMetaMask || eth.isPhantom || eth.isCoinbaseWallet || eth.isBraveWallet) {
    console.warn("[tripwire] Browser extension wallet detected. Mini App will refuse to use it.");
  }
}
