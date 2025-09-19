// lib/verifyWallet.ts
import { recoverMessageAddress, recoverTypedDataAddress } from 'viem';
import { withTimeout } from './withTimeout';
import { getFarcasterProvider } from './farcasterProvider';

const VERIFY_MSG = 'miniapp:verify';

export async function verifyFarcasterWallet() {
  const provider = await getFarcasterProvider();
  if (!provider) throw new Error('Farcaster Wallet provider not found');

  const chainId = await provider.request({ method: 'eth_chainId' });

  let accounts: string[] = await provider.request({ method: 'eth_accounts' });
  if (!accounts?.length) {
    accounts = await withTimeout(
      provider.request({ method: 'eth_requestAccounts' }),
      30_000,
      'eth_requestAccounts'
    );
  }
  const addr = accounts?.[0];
  if (!addr) throw new Error('No account from provider');

  // 1) Try personal_sign
  try {
    const sig = await withTimeout(
      provider.request({ method: 'personal_sign', params: [VERIFY_MSG, addr] }),
      30_000,
      'personal_sign'
    );
    const rec = (await recoverMessageAddress({ message: VERIFY_MSG, signature: sig })).toLowerCase();
    if (rec !== addr.toLowerCase()) throw new Error('personal_sign: recovered address mismatch');
    return { address: addr.toLowerCase(), chainId };
  } catch (e) {
    console.warn('[verify] personal_sign failed, falling back to typed-data:', e);
  }

  // 2) Fallback: EIP-712 typed-data (eth_signTypedData_v4)
  const timestamp = Math.floor(Date.now() / 1000);
  const domain = {
    name: 'MetaDaave MiniApp',
    version: '1',
    chainId: parseInt(chainId, 16),
  } as const;

  const types = {
    Verify: [
      { name: 'purpose', type: 'string' },
      { name: 'app', type: 'string' },
      { name: 'ts', type: 'uint256' },
    ],
  } as const;

  const message = {
    purpose: 'verify',
    app: 'metadaave.vercel.app',
    ts: BigInt(timestamp),
  } as const;

  const typedParams = [
    addr,
    JSON.stringify({
      types: { EIP712Domain: [], ...types }, // wallet will inject domain correctly
      domain,
      primaryType: 'Verify',
      message,
    }),
  ];

  const sig712 = await withTimeout(
    provider.request({ method: 'eth_signTypedData_v4', params: typedParams }),
    30_000,
    'eth_signTypedData_v4'
  );

  const rec712 = (await recoverTypedDataAddress({
    domain, types, primaryType: 'Verify', message, signature: sig712,
  })).toLowerCase();

  if (rec712 !== addr.toLowerCase()) {
    throw new Error('typed-data: recovered address mismatch');
  }

  return { address: addr.toLowerCase(), chainId };
}
