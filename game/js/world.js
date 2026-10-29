// The run: pomegranate, ramps, bumpers, seeds, camera, scoring.
// Pure simulation: it pushes events (sounds, effects) for main.js to act on.
import * as C from './config.js';
import { makeRng } from './rng.js';
import { createBoss, updateBoss, bossTryHit, bossSolidAt, bossRescue } from './boss.js';

export function createWorld(seed) {
  const rng = makeRng(seed);
  const w = {
    seed, rng,
    t: 0, bonus: 0, score: 0, speed: 1, seeds: 0, golden: false,
    combo: 0, maxDepth: 0,
    ramps: [], next: null, lastDir: 1,
    cooldown: 0, buffered: null,
    bumpers: [], bumperTimer: 0, nextBumperAt: 8, lastJackpotT: -999,
    seed_: null, seedTimer: C.SEED_FIRST - 0, seedsSpawned: 0,
    cameraY: 0, camVel: 0, cameraLocked: false,
    mode: 'descent', boss: null,
    dying: false, dieT: 0, over: false, won: false,
    shake: 0, hitStop: 0,
    events: [],
    stats: { bounces: 0, bestCombo: 0, bumpers: 0, hadesHits: 0 },
  };
  const start = makeRamp(C.W / 2 - 50, 240, 5, 150);
  start.isStart = true;
  w.ramps.push(start);
  w.pom = {
    x: start.x1 + 34, y: 0, vx: 0, vy: 0, r: C.POM_R, rot: 0,
    onRamp: start, prog: -0.38, fallStartY: null, bouncing: false,
    squash: 0, lastX: 0, lastY: 0,
  };
  placeOnRamp(w.pom);
  w.cameraY = w.pom.y - C.dims.H / 3;
  w.next = randomPiece(w);
  w.after = randomPiece(w);
  w.ready = 1.0; // "get ready" pause before the pom starts rolling
  return w;
}

export function makeRamp(x, y, angle, length) {
  const rad = angle * Math.PI / 180;
  return {
    x, y, angle, length, rad,
    x1: x - Math.cos(rad) * length / 2, y1: y - Math.sin(rad) * length / 2,
    x2: x + Math.cos(rad) * length / 2, y2: y + Math.sin(rad) * length / 2,
    opacity: 1, passed: false, age: 0, burning: 0,
  };
}

function randomPiece(w) {
  const dir = w.rng.chance(0.7) ? -w.lastDir : w.lastDir;
  w.lastDir = dir;
  const angle = w.rng.pick(C.RAMP_ANGLES.filter(a => (dir > 0 ? a > 0 : a < 0)));
  const length = w.rng.pick(C.RAMP_LENGTHS);
  return { angle, length };
}

const emit = (w, type, data = {}) => w.events.push({ type, ...data });

// ---------- placing ramps ----------

export function canPlace(w) {
  return !w.over && !w.dying && w.mode !== 'victory' && w.mode !== 'boss-outro';
}

// sx, sy are screen (logical) coordinates. Returns 'placed', 'buffered' or 'denied'.
export function tryPlace(w, sx, sy) {
  if (!canPlace(w)) return 'denied';
  if (w.cooldown > 0) {
    // Never lose a tap: keep the latest one and place it when the cooldown ends.
    if (w.buffered) emit(w, 'deny');
    w.buffered = { x: sx, wy: clampAim(sy) + w.cameraY };
    return 'buffered';
  }
  placeNow(w, sx, sy);
  return 'placed';
}

export function clampAim(sy) {
  return Math.max(C.HUD_TOP, Math.min(C.dims.H - C.FIRE_H - 10, sy));
}

function placeNow(w, sx, sy) {
  const y = clampAim(sy) + w.cameraY;
  const x = Math.max(20, Math.min(C.W - 20, sx));
  const ramp = makeRamp(x, y, w.next.angle, w.next.length);
  ramp.drop = 1; // little drop-in animation
  w.ramps.push(ramp);
  w.next = w.after;
  w.after = randomPiece(w);
  w.cooldown = cooldownFor(w);
  w.buffered = null;
  if (w.mode === 'boss') {
    const live = w.ramps.filter(r => !r.crumbling && r !== w.pom.onRamp);
    if (live.length > 4) crumble(w, live[0]);
  }
  emit(w, 'place', { x, y: y - w.cameraY });
}

export const cooldownFor = w => Math.max(0.15, C.COOLDOWN / Math.sqrt(w.speed));

export function crumble(w, ramp) {
  if (ramp.crumbling) return;
  ramp.crumbling = true;
  ramp.passed = true;
  if (w.pom.onRamp === ramp) leaveRamp(w);
  emit(w, 'crumble', { x: ramp.x, y: ramp.y - w.cameraY, ramp });
}

// ---------- simulation ----------

export function update(w, dt) {
  if (w.hitStop > 0) { w.hitStop -= dt; return; }
  w.shake = Math.max(0, w.shake - dt);

  if (w.ready > 0) {
    w.ready -= dt;
    return;
  }
  if (!w.over && !w.dying && w.mode !== 'victory') {
    w.t += dt;
    w.speed = Math.min(C.SPEED_MAX, 1 + C.SPEED_PER_SEC * w.t + C.SPEED_PER_SEED * w.seeds);
  }
  w.cooldown = Math.max(0, w.cooldown - dt);
  if (w.buffered && w.cooldown <= 0) {
    const sy = w.buffered.wy - w.cameraY;
    if (sy >= C.HUD_TOP - 30 && w.mode !== 'boss-intro') placeNow(w, w.buffered.x, sy);
    w.buffered = null;
  }

  if (w.mode !== 'boss-intro') {
    const steps = 2;
    for (let i = 0; i < steps; i++) stepPom(w, dt / steps);
  }

  updateCamera(w, dt);
  updateRamps(w, dt);
  if (w.mode === 'descent') {
    updateBumperSpawns(w, dt);
    updateSeedSpawns(w, dt);
  }
  updateBumpers(w, dt);
  checkSeed(w);
  if (w.boss) updateBoss(w, dt);

  if (w.dying) {
    w.dieT += dt;
    if (w.dieT > 0.9 && !w.over) { w.over = true; emit(w, 'gameover'); }
  }
  w.maxDepth = Math.max(w.maxDepth, w.pom.y);
  if (!w.over) w.score = Math.floor(w.t * 10) + w.bonus;
}

function placeOnRamp(pom) {
  const r = pom.onRamp, t = 0.5 + pom.prog;
  pom.x = r.x1 + (r.x2 - r.x1) * t;
  pom.y = r.y1 + (r.y2 - r.y1) * t - pom.r - 2;
}

function leaveRamp(w) {
  const pom = w.pom, r = pom.onRamp;
  if (!r) return;
  const dir = r.angle > 0 ? 1 : -1;
  const roll = rollSpeed(w, r);
  pom.vx = Math.cos(r.rad) * roll * dir;
  pom.vy = Math.sin(r.rad) * roll * dir + 50;
  r.passed = true;
  pom.lastRamp = r;
  pom.onRamp = null;
  pom.airT = 0;
  pom.fallStartY = pom.y;
}

const rollSpeed = (w, r) => C.BASE_ROLL * w.speed * (1 + Math.abs(Math.sin(r.rad)) * 1.5);

function stepPom(w, dt) {
  const pom = w.pom;
  if (w.dying || w.mode === 'victory') {
    if (w.dying) { pom.vy += C.GRAVITY * 0.3 * dt; pom.y += pom.vy * dt * 0.3; }
    return;
  }
  pom.squash = Math.max(0, pom.squash - dt * 4);
  pom.lastX = pom.x; pom.lastY = pom.y;
  if (pom.onRamp) {
    const r = pom.onRamp;
    const dir = r.angle > 0 ? 1 : -1;
    const roll = rollSpeed(w, r);
    pom.prog += (roll * dt) / r.length * dir;
    pom.rot += roll * dt * dir / pom.r;
    const t = 0.5 + pom.prog;
    if (t < 0 || t > 1 || r.crumbling) leaveRamp(w);
    else placeOnRamp(pom);
  } else {
    pom.vy += C.GRAVITY * (w.boss ? w.boss.updraft : 1) * dt;
    pom.airT = (pom.airT || 0) + dt;
    if (pom.airT > 0.5) pom.lastRamp = null;
    pom.x += pom.vx * dt;
    pom.y += pom.vy * dt;
    pom.rot += pom.vx / pom.r * dt;
    if (pom.bouncing && pom.vy > 0) { pom.bouncing = false; pom.fallStartY = pom.y; }
    if (pom.x - pom.r < 0) { pom.x = pom.r; pom.vx = Math.abs(pom.vx) * C.WALL_BOUNCE; emit(w, 'wall'); }
    if (pom.x + pom.r > C.W) { pom.x = C.W - pom.r; pom.vx = -Math.abs(pom.vx) * C.WALL_BOUNCE; emit(w, 'wall'); }
    if (w.cameraLocked && pom.y - pom.r < w.cameraY + 4 && pom.vy < 0) {
      pom.y = w.cameraY + 4 + pom.r; pom.vy = -pom.vy * 0.5; emit(w, 'wall');
    }
    checkBumperHits(w);
    if (w.boss && bossTryHit(w)) return;
    if (!pom.bouncing && pom.vy >= 0) checkLanding(w);
  }
  // fell into the fire?
  const sy = pom.y - w.cameraY;
  if (!w.dying && sy > C.dims.H - C.DEATH_FROM_BOTTOM && !(w.boss && bossSolidAt(w, pom.x)) && !bossRescue(w)) {
    w.dying = true; w.dieT = 0; pom.vy = 60; w.shake = 0.35;
    emit(w, 'burn', { x: pom.x, y: sy });
  }
}

function surfaceY(r, x) {
  const t = (x - r.x1) / (r.x2 - r.x1);
  return r.y1 + (r.y2 - r.y1) * Math.max(0, Math.min(1, t));
}

function checkLanding(w) {
  const pom = w.pom;
  for (const r of w.ramps) {
    if (r.crumbling || (r.passed && w.mode === 'descent') || r === w.pom.lastRamp) continue;
    const minX = Math.min(r.x1, r.x2) - pom.r * 0.6, maxX = Math.max(r.x1, r.x2) + pom.r * 0.6;
    if (pom.x < minX || pom.x > maxX) continue;
    const s = surfaceY(r, pom.x);
    const bottom = pom.y + pom.r, prevBottom = pom.lastY + pom.r;
    if (prevBottom <= surfaceY(r, pom.lastX) + C.RAMP_THICK && bottom >= s - 2) {
      land(w, r);
      return;
    }
  }
}

function land(w, r) {
  const pom = w.pom;
  const drop = pom.fallStartY == null ? 0 : pom.y - pom.fallStartY;
  const t = Math.max(0, Math.min(1, (pom.x - r.x1) / (r.x2 - r.x1)));
  pom.y = r.y1 + (r.y2 - r.y1) * t - pom.r - 2;
  if (drop > C.BOUNCE_MIN_DROP) {
    pom.vy = -Math.min(drop * 1.2, C.BOUNCE_MAX_VY);
    pom.bouncing = true;
    pom.squash = 1;
    w.combo++;
    w.stats.bounces++;
    w.stats.bestCombo = Math.max(w.stats.bestCombo, w.combo);
    const mult = Math.min(w.combo, 10);
    const pts = Math.floor((drop - C.BOUNCE_MIN_DROP) / (2 * C.K)) * mult * (w.golden ? 2 : 1);
    if (pts > 0) w.bonus += pts;
    emit(w, 'bounce', { x: pom.x, y: pom.y - w.cameraY, combo: w.combo, pts });
    pom.fallStartY = pom.y;
  } else {
    pom.onRamp = r;
    pom.prog = t - 0.5;
    pom.fallStartY = null;
    if (w.combo > 0) w.combo = 0;
    pom.squash = Math.min(1, drop / C.BOUNCE_MIN_DROP) * 0.6;
    emit(w, 'land', { x: pom.x, y: pom.y - w.cameraY, soft: drop < 20 });
  }
}

function updateCamera(w, dt) {
  if (w.cameraLocked || w.dying || w.over) { w.camVel = 0; return; }
  const target = w.pom.y - C.dims.H / 3;
  const diff = target - w.cameraY;
  const minSpeed = C.BASE_ROLL * w.speed * 0.7;
  let tv = diff * 2.5;
  if (diff > 0) tv = Math.max(minSpeed, tv);
  w.camVel += (tv - w.camVel) * 4 * dt;
  w.cameraY += w.camVel * dt;
  if (diff > 0 && w.cameraY > target) w.cameraY = target;
}

function updateRamps(w, dt) {
  for (let i = w.ramps.length - 1; i >= 0; i--) {
    const r = w.ramps[i];
    r.age += dt;
    if (r.drop > 0) r.drop = Math.max(0, r.drop - dt * 6);
    if ((r.crumbling || (r.passed && w.mode === 'descent')) && w.pom.onRamp !== r) r.opacity -= dt * (r.crumbling ? 3 : 2.5);
    const above = r.y + 40 < w.cameraY;
    if (r.opacity <= 0 || above) w.ramps.splice(i, 1);
  }
}

// ---------- bumpers ----------

function updateBumperSpawns(w, dt) {
  w.bumperTimer += dt;
  if (w.bumperTimer < w.nextBumperAt) return;
  w.bumperTimer = 0;
  const lo = 2, hi = 5;
  w.nextBumperAt = hi - (hi - lo) * Math.min(w.speed / 3, 1);
  spawnBumper(w);
}

function spawnBumper(w) {
  const depthMult = 1 + Math.floor(w.maxDepth / (2000 * C.K));
  const canJackpot = !w.bumpers.some(b => b.jackpot) && w.t - w.lastJackpotT >= C.JACKPOT_GAP && w.t > 30;
  let b;
  if (canJackpot && w.rng.chance(0.15)) {
    w.lastJackpotT = w.t;
    b = { kind: 'jackpot', jackpot: true, r: C.JACKPOT.r, baseR: C.JACKPOT.r, hits: C.JACKPOT.hits, points: C.JACKPOT.perHit };
  } else {
    const roll = w.rng.next();
    const kind = w.speed < 1.6 ? (roll < 0.6 ? 'small' : 'medium') : (roll < 0.4 ? 'small' : roll < 0.75 ? 'medium' : 'large');
    const cfg = C.BUMPERS[kind];
    b = { kind, r: cfg.r, baseR: cfg.r, points: cfg.points * depthMult };
  }
  const y = w.cameraY + C.dims.H + 100 + w.rng.next() * 200;
  for (let tries = 0; tries < 8; tries++) {
    const x = 60 + b.r + w.rng.next() * (C.W - 120 - 2 * b.r);
    const clear = w.bumpers.every(o => Math.hypot(o.x - x, o.y - y) > o.r + b.r + 60)
      && (!w.seed_ || Math.hypot(w.seed_.x - x, w.seed_.y - y) > b.r + 90);
    if (clear) {
      Object.assign(b, { x, y, recoil: 0, light: 0, pulse: w.rng.next() * 6 });
      w.bumpers.push(b);
      return;
    }
  }
}

function updateBumpers(w, dt) {
  for (let i = w.bumpers.length - 1; i >= 0; i--) {
    const b = w.bumpers[i];
    b.recoil = Math.max(0, b.recoil - dt);
    b.light = Math.max(0, b.light - dt);
    b.pulse += dt * 3;
    if (b.popping != null) {
      b.popping += dt * 3;
      if (b.popping >= 1) w.bumpers.splice(i, 1);
      continue;
    }
    if (b.y + b.r < w.cameraY - 60) w.bumpers.splice(i, 1);
  }
}

function checkBumperHits(w) {
  const pom = w.pom;
  for (const b of w.bumpers) {
    if (b.popping != null) continue;
    const dx = pom.x - b.x, dy = pom.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    const min = pom.r + b.r;
    if (d >= min) continue;
    const nx = dx / d, ny = dy / d;
    const v = C.BUMPER_FORCE * (1 + w.speed * 0.2);
    pom.vx = nx * v; pom.vy = ny * v;
    pom.x = b.x + nx * (min + 1); pom.y = b.y + ny * (min + 1);
    pom.bouncing = pom.vy < 0;
    pom.fallStartY = pom.y;
    b.recoil = 0.15; b.light = 0.25;
    w.combo++;
    w.stats.bumpers++;
    w.stats.bestCombo = Math.max(w.stats.bestCombo, w.combo);
    const mult = Math.min(w.combo, 10) * (w.golden ? 2 : 1);
    const sy = b.y - w.cameraY;
    if (b.jackpot) {
      b.hits--;
      let pts = C.JACKPOT.perHit * mult;
      w.bonus += pts;
      b.r = b.baseR * (1 - C.JACKPOT.shrink * (C.JACKPOT.hits - b.hits));
      if (b.hits <= 0) {
        const extra = C.JACKPOT.bonus * (w.golden ? 2 : 1);
        w.bonus += extra; pts += extra;
        b.popping = 0;
        emit(w, 'jackpot', { x: b.x, y: sy, pts, combo: w.combo });
      } else emit(w, 'jackpotHit', { x: b.x, y: sy, pts, combo: w.combo, left: b.hits });
    } else {
      const pts = b.points * mult;
      w.bonus += pts;
      emit(w, 'bumper', { x: b.x, y: sy, pts, combo: w.combo, kind: b.kind });
    }
    return;
  }
}

// ---------- seeds ----------

function updateSeedSpawns(w, dt) {
  if (w.seeds >= C.MAX_SEEDS || w.seed_) return;
  w.seedTimer -= dt;
  if (w.seedTimer > 0) return;
  const y = w.cameraY + C.dims.H + 500 + w.rng.next() * 300;
  let x = C.W / 2;
  for (let tries = 0; tries < 10; tries++) {
    x = C.W * 0.15 + w.rng.next() * C.W * 0.7;
    if (w.bumpers.every(b => Math.hypot(b.x - x, b.y - y) > b.r + 90)) break;
  }
  w.seed_ = { x, y, pulse: 0 };
  w.seedsSpawned++;
  emit(w, 'seedSpawn');
}

function checkSeed(w) {
  const s = w.seed_;
  if (!s) return;
  s.pulse += 1 / 60 * 4;
  if (s.y < w.cameraY - 80) { w.seed_ = null; w.seedTimer = C.SEED_GAP_MISSED; emit(w, 'seedMissed'); return; }
  if (w.dying || w.mode !== 'descent') return;
  if (Math.hypot(w.pom.x - s.x, w.pom.y - s.y) < w.pom.r + C.SEED_COLLECT) {
    w.seeds++;
    const pts = w.seeds * 1000 * (w.golden ? 2 : 1);
    w.bonus += pts;
    w.seed_ = null;
    w.seedTimer = w.seeds >= 4 ? 9 : C.SEED_GAP;
    emit(w, 'seed', { x: s.x, y: s.y - w.cameraY, n: w.seeds, pts });
    if (w.seeds >= C.MAX_SEEDS) startBossIntro(w);
  }
}

export function startBossIntro(w) {
  w.golden = true;
  w.mode = 'boss-intro';
  w.cameraLocked = true;
  w.camVel = 0;
  w.boss = createBoss(w);
  w.seed_ = null;
  for (const b of w.bumpers) if (b.popping == null) b.popping = 0;
  emit(w, 'golden', { x: w.pom.x, y: w.pom.y - w.cameraY });
  emit(w, 'bossIntro');
}

export function screenPom(w) {
  return { x: w.pom.x, y: w.pom.y - w.cameraY };
}
