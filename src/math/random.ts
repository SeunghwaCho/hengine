/**
 * Mulberry32: small, fast, seedable PRNG. Returns values in [0, 1).
 * Use for deterministic gameplay (replays, daily challenges, AI seeds).
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function (): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export function randInt(rng: Rng, minIncl: number, maxExcl: number): number {
  return Math.floor(rng() * (maxExcl - minIncl)) + minIncl;
}

export function randRange(rng: Rng, min: number, max: number): number {
  return rng() * (max - min) + min;
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pick from empty array");
  return arr[Math.floor(rng() * arr.length)];
}

/** Fisher-Yates shuffle, in-place. */
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** Roll an N-sided die. */
export function rollDie(rng: Rng, sides = 6): number {
  return Math.floor(rng() * sides) + 1;
}
