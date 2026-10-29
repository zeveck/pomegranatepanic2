// Test-only bot: predicts where the pom will fall and places the NEXT ramp
// under it through the same tryPlace() a click uses (so it obeys the cooldown).
import * as C from './config.js';
import { tryPlace } from './world.js';
import { bossWantsFall, bossTarget } from './boss.js';

const LOOK = 1.6, DT = 1 / 60;

function predictPath(w) {
  const p = w.pom;
  let x = p.x, y = p.y, vx = p.vx, vy = p.vy;
  const pts = [];
  if (p.onRamp) {
    const r = p.onRamp, dir = r.angle > 0 ? 1 : -1;
    const roll = C.BASE_ROLL * w.speed * (1 + Math.abs(Math.sin(r.rad)) * 1.5);
    const t = 0.5 + p.prog;
    const remain = (dir > 0 ? 1 - t : t) * r.length;
    const tExit = remain / roll;
    const ex = dir > 0 ? r.x2 : r.x1, ey = (dir > 0 ? r.y2 : r.y1) - p.r - 2;
    x = ex; y = ey; vx = Math.cos(r.rad) * roll * dir; vy = Math.sin(r.rad) * roll * dir + 50;
    for (let s = 0; s < tExit; s += DT) pts.push(null); // time spent rolling
  }
  const g = C.GRAVITY * (w.boss && w.boss.updraft ? w.boss.updraft : 1);
  for (let s = 0; s < LOOK; s += DT) {
    vy += g * DT; x += vx * DT; y += vy * DT;
    if (x < p.r) { x = p.r; vx = Math.abs(vx) * C.WALL_BOUNCE; }
    if (x > C.W - p.r) { x = C.W - p.r; vx = -Math.abs(vx) * C.WALL_BOUNCE; }
    pts.push({ x, y, vy });
  }
  return pts;
}

function caughtBy(w, pt) {
  for (const r of w.ramps) {
    if (r.passed || r.crumbling || r === w.pom.onRamp) continue;
    const minX = Math.min(r.x1, r.x2) - 8, maxX = Math.max(r.x1, r.x2) + 8;
    if (pt.x < minX || pt.x > maxX) continue;
    const t = (pt.x - r.x1) / (r.x2 - r.x1);
    const sy = r.y1 + (r.y2 - r.y1) * t;
    if (pt.y + w.pom.r >= sy - 4 && pt.y + w.pom.r <= sy + 40) return true;
  }
  return false;
}

export function autopilotTick(w, dt) {
  if (w.ready > 0 || w.dying || w.cooldown > 0 || w.mode === 'boss-intro' || w.mode === 'victory' || w.mode === 'boss-outro') return;
  if (w.pom.bouncing && w.pom.vy < -200) return;
  const pts = predictPath(w);
  const H = C.dims.H;
  for (const pt of pts) if (pt && caughtBy(w, pt)) return; // something will catch it
  if (bossWantsFall(w, pts)) return;
  // aim: the point where the pom will be in ~0.3–0.6 s, but on screen and above the fire
  let target = null;
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    if (!pt) continue;
    const sy = pt.y - w.cameraY;
    if (i * DT > 0.28 && pt.vy > 0 && sy > C.HUD_TOP + 20) { target = pt; break; }
    if (sy > H - C.FIRE_H - 60) { target = pt; break; }
  }
  if (!target) return;
  let sy = target.y - w.cameraY + w.pom.r + 18;
  if (sy > H - C.FIRE_H - 20) sy = H - C.FIRE_H - 20;
  // shift the ramp so its uphill end is under the pom and it rolls away from the near wall / toward a seed
  const dir = w.next.angle > 0 ? 1 : -1;
  let x = target.x + dir * w.next.length * 0.25;
  const hades = bossTarget(w);
  if (hades) {
    // aim: put the ramp's downhill end right above his head if the pom can land on it
    const half = Math.cos(w.next.angle * Math.PI / 180) * w.next.length / 2;
    const cx = hades.x - dir * half - dir * 10;
    if (Math.abs(target.x - cx) < half * 0.85) x = cx;
  }
  x = Math.max(w.next.length / 2 * 0.9, Math.min(C.W - w.next.length / 2 * 0.9, x));
  tryPlace(w, x, sy);
}
