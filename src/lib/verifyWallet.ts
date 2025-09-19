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

// Grab the Farcaster embedded provider (same one Wallet uses)
async function getFarcasterProvider(): Promise<any> {
  // Window-injected provider for wallet.farcaster.xyz
  // Prefer existing global if app set it elsewhere.
  // @ts-ignore
  const provider = window?.ethereum || (window as any)?.farcaster?.walletProvider || (window as any)?.walletProvider;
  return provider ?? null;
}

export async function verifyFarcasterWallet() {
  const provider = await getFarcasterProvider();
  if (!provider) throw new Error("Farcaster Wallet provider not found");

  const chainIdHex: string = await provider.request({ method: "eth_chainId" });
  const chainIdDec = Number(chainIdHex); // signTypedData_v4 domain.chainId prefers a number

  let accounts: string[] = await provider.request({ method: "eth_accounts" });
  if (!accounts?.length) {
    accounts = await withTimeout(
      provider.request({ method: "eth_requestAccounts" }),
      30_000,
      "eth_requestAccounts"
    );
  }
  const addr = accounts?.[0];
  if (!addr) throw new Error("No account from provider");

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