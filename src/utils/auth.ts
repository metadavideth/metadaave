// src/utils/auth.ts
export function makeSiweNonce(len = 16) {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => (b % 36).toString(36)).join('') // [a-z0-9]
}

export function sanitizeNonce(n?: string, min = 8) {
  const cleaned = (n || '').replace(/[^a-z0-9]/gi, '')
  return cleaned.length >= min ? cleaned : ''
}
