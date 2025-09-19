// lib/verifyWallet.ts
import { recoverMessageAddress } from 'viem';
import { getFarcasterProvider } from './farcasterProvider';
import { withTimeout } from './withTimeout';

const VERIFY_MSG = 'miniapp:verify';

export async function verifyFarcasterWallet(): Promise<{ address: string, chainId: string }> {
  const provider = await getFarcasterProvider();
  if (!provider) throw new Error('Farcaster Wallet provider not found');

  // make sure we only prompt once
  const chainId = await provider.request({ method: 'eth_chainId' });

  // get account without retry loops
  let accounts: string[] = await provider.request({ method: 'eth_accounts' });
  if (!accounts?.length) {
    accounts = await withTimeout(
      provider.request({ method: 'eth_requestAccounts' }),
      10_000,
      'eth_requestAccounts'
    );
  }
  const addr = accounts?.[0];
  if (!addr) throw new Error('No account returned by Farcaster Wallet provider');

  // pure RPC sign (no REST). 8s timeout.
  const sig = await withTimeout(
    provider.request({ method: 'personal_sign', params: [VERIFY_MSG, addr] }),
    8_000,
    'personal_sign'
  );

  const recovered = (await recoverMessageAddress({ message: VERIFY_MSG, signature: sig })).toLowerCase();
  if (recovered !== addr.toLowerCase()) {
    throw new Error('Wallet mismatch: recovered address does not match provider address (not Farcaster Wallet).');
  }

  return { address: addr.toLowerCase(), chainId };
}
