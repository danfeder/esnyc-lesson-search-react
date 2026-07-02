// Constant-time byte-equality for secrets. Deno 2 removed the non-standard
// crypto.subtle.timingSafeEqual, so we implement the standard XOR fold.
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
