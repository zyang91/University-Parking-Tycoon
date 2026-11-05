// Seeded pseudorandom number generator (mulberry32).
// The generator state is a single 32-bit integer stored in GameState,
// so saves restore exactly the same random sequence.

export function nextRandom(state: number): { value: number; state: number } {
  let t = (state + 0x6d2b79f5) | 0;
  const nextState = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: nextState };
}

/** Normalise any user-provided seed into a positive 32-bit integer. */
export function normalizeSeed(seed: number | string): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  }
  const str = String(seed);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 2147483646) + 1;
}

export function randomSeed(): number {
  return normalizeSeed(Math.floor(Math.random() * 2147483646));
}

/** Stable string hash, used for flavour-text variety without consuming RNG. */
export function hashPick<T>(items: readonly T[], key: string): T {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  return items[Math.abs(h) % items.length];
}
