/**
 * Deterministic test "embedding": hashed bag of words → 1536-dim unit vector (similar texts ⇒ high cosine).
 * Kept free of app imports so vi.mock factories can use it without circular imports.
 */
import crypto from 'node:crypto';

export function fakeVector(text) {
  const v = new Array(1536).fill(0);
  for (const w of String(text).toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 2)) {
    const h = crypto.createHash('md5').update(w).digest();
    v[h.readUInt16BE(0) % 1536] += 1;
    v[h.readUInt16BE(2) % 1536] += 0.5;
  }
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / n);
}
