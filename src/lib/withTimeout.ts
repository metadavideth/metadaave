// lib/withTimeout.ts
export async function withTimeout<T>(p: Promise<T>, ms: number, tag='op'): Promise<T> {
  let t: any;
  const to = new Promise<never>((_, rej) =>
    t = setTimeout(() => rej(new Error(`${tag}: timeout after ${ms}ms`)), ms)
  );
  try { return await Promise.race([p, to]); }
  finally { clearTimeout(t); }
}
