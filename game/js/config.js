// Tuning numbers. Logical screen is 540x960; the original game's numbers are
// scaled by K so it plays the same on our wider logical screen.
export const W = 540;
export const dims = { H: 960 }; // logical height: 960..1170, set to fill the screen
export const H_MIN = 960, H_MAX = 1170;
export const K = 1.35;

export const GRAVITY = 800 * K;
export const WALL_BOUNCE = 0.6;
export const BASE_ROLL = 80 * K;
export const POM_R = 18 * K;
export const RAMP_ANGLES = [-35, -20, -10, 10, 20, 35];
export const RAMP_LENGTHS = [80 * K, 120 * K, 160 * K];
export const RAMP_THICK = 12 * K;
export const BOUNCE_MIN_DROP = 80 * K;
export const BOUNCE_MAX_VY = 700 * K;

export const SPEED_PER_SEC = 0.03;      // deliberate new curve (original: 1 + 0.06t, uncapped)
export const SPEED_PER_SEED = 0.15;
export const SPEED_MAX = 4;

export const COOLDOWN = 0.3;

export const BUMPERS = {
  small: { r: 28 * K, points: 50, img: 'bumper-s', color: '#d9452f', light: '#ffe66d' },
  medium: { r: 32 * K, points: 100, img: 'bumper-m', color: '#2fb5a8', light: '#ffffff' },
  large: { r: 38 * K, points: 150, img: 'bumper-l', color: '#8e4fc4', light: '#ff9a6b' },
};
export const JACKPOT = { r: 50 * K, perHit: 1000, bonus: 5000, hits: 5, shrink: 0.12, img: 'bumper-j' };
export const BUMPER_FORCE = 500 * K;
export const JACKPOT_GAP = 45;

export const SEED_R = 13 * K;
export const SEED_COLLECT = 26 * K;
export const SEED_FIRST = 15;
export const SEED_GAP = 12;        // after a collect
export const SEED_GAP_MISSED = 6;  // after one scrolls away
export const MAX_SEEDS = 6;

export const FIRE_H = 70;          // fire band at the bottom of the screen
export const DEATH_FROM_BOTTOM = 60; // pom centre below H-60 (on screen) = in the fire
export const HUD_TOP = 96;         // can't place ramps above this line
