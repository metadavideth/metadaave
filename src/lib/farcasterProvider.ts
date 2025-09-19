// lib/farcasterProvider.ts
export type Eip6963Detail = { info: { name?: string; rdns?: string }, provider: any };

export async function getFarcasterProvider(): Promise<any | undefined> {
  const candidates: Eip6963Detail[] = [];
  function onAnnounce(e: any) { if (e?.detail) candidates.push(e.detail); }
  window.addEventListener('eip6963:announceProvider', onAnnounce);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  await new Promise(r => setTimeout(r, 60));
  window.removeEventListener('eip6963:announceProvider', onAnnounce);

  const looksFC = (s?: string) => (s||'').toLowerCase().includes('privy') || (s||'').toLowerCase().includes('farcaster');
  const byRdns = candidates.find(d => looksFC(d.info.rdns));
  if (byRdns) return byRdns.provider;
  const byName = candidates.find(d => looksFC(d.info.name));
  if (byName) return byName.provider;

  const inFC =
    window.top !== window.self &&
    (document.referrer.includes('farcaster.xyz') ||
     location.hostname.includes('wallet.farcaster.xyz') ||
     location.hostname.includes('farcaster.xyz'));

  if (inFC && (window as any).ethereum) return (window as any).ethereum;

  return undefined;
}
