// Seedet pseudo-tilfældighed (mulberry32) → deterministisk simulation.
// Se ARCHITECTURE.md §1 (princip 5) og §10.

/** @param {number} seed @returns {() => number} funktion der giver 0..1 */
export function createRng(seed = 1) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (rng, min, max) => min + (max - min) * rng();
export const pick = (rng, arr) => arr[(rng() * arr.length) | 0];
