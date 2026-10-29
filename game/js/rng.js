// Seeded random numbers (mulberry32), so a run can be replayed from its seed.
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: arr => arr[Math.floor(next() * arr.length)],
    chance: p => next() < p,
  };
}

export function randomSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}
