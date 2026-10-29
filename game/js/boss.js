// Hades: intro, the rise/hit/sink/away cycle, anger stages, fireballs,
// heat updraft, Persephone's blessing, defeat. Arena = camera locked.
import * as C from './config.js';
import { makeRamp, crumble } from './world.js';

const HADES_W = 960, HADES_H = 640;          // drawn size (logical); shoulders run off the screen edges
const HIDE = 680;                            // how far below "risen" he sinks
const HEAD_TOP = 450;                        // risen: sprite top sits this far above the screen bottom
// Hit ellipse over his head (crown to chin), as fractions of the 1152x768 sprite (measured on hades-1).
const EL = { cx: 0.5, cy: 0.34, rx: 0.165, ry: 0.23 };
// His shoulders: a wide, low ellipse. Solid while he's up (you bounce off), never a hit.
const SH = { cy: 1.05, rx: 0.40, ry: 0.45 };
const INTRO = 2.5, SINK = 0.8, RISE = 0.8;
const HIT_PTS = 2500, CRIT_PTS = 5000, DEFEAT_PTS = 20000;
const UPDRAFT = 0.55, UPDRAFT_CAP = 480;

const emit = (w, type, data = {}) => w.events.push({ type, ...data });

export function createBoss(w) {
  for (const r of w.ramps) crumble(w, r);
  return {
    hp: 5, stage: 1, phase: 'intro', t: 0, rise: HIDE, drift: 0, driftT: 0,
    fireballs: [], fireT: 0, updraft: 1, blessing: true, flash: 0, hurt: 0,
    bubble: { x0: w.pom.x, y0: w.pom.y - w.cameraY }, fireSwell: 0, warned: false,
    firstRise: true, risenT: 0, defeatT: 0, crack: 0, gaps: [],
  };
}

export const bossSpeed = b => 1.4 + 0.1 * (5 - b.hp);

function geom(w) {
  const b = w.boss, H = C.dims.H;
  const left = C.W / 2 - HADES_W / 2 + b.drift;
  const top = H - HEAD_TOP + b.rise;
  return {
    left, top,
    cx: left + HADES_W * EL.cx, cy: top + HADES_H * EL.cy,
    rx: HADES_W * EL.rx, ry: HADES_H * EL.ry,
    scy: top + HADES_H * SH.cy, srx: HADES_W * SH.rx, sry: HADES_H * SH.ry,
  };
}

const live = b => (b.phase === 'risen') || (b.phase === 'rising' && b.rise <= HIDE / 2);

// ---------- update ----------

export function updateBoss(w, dt) {
  const b = w.boss;
  b.t += dt;
  b.flash = Math.max(0, b.flash - dt * 3);
  b.hurt = Math.max(0, b.hurt - dt);
  if (w.mode === 'boss' || w.mode === 'boss-intro') w.speed = bossSpeed(b);

  switch (b.phase) {
    case 'intro': {
      // pom floats in its bubble to top-centre while Hades rises
      const k = Math.min(1, b.t / INTRO), e = k * k * (3 - 2 * k);
      const tx = C.W / 2 - 150, ty = C.HUD_TOP + 180;
      w.pom.x = b.bubble.x0 + (tx - b.bubble.x0) * e;
      w.pom.y = w.cameraY + b.bubble.y0 + (ty - b.bubble.y0) * e;
      w.pom.rot += dt * 2;
      b.fireSwell = Math.min(1, b.t);
      if (b.t > 0.7) {
        if (b.firstRise) { b.firstRise = false; emit(w, 'hadesRise', { first: true }); }
        b.rise = HIDE * (1 - Math.min(1, (b.t - 0.7) / (INTRO - 0.7)));
      }
      if (b.t >= INTRO) {
        b.rise = 0;
        // a short ledge just left of his nose: do nothing and the pom drops onto his face
        const ledge = makeRamp(geom(w).cx - 175, w.pom.y + w.pom.r + 8, 10, 120);
        ledge.isStart = true;
        w.ramps.push(ledge);
        w.pom.onRamp = ledge; w.pom.prog = -0.3; w.pom.vx = 0; w.pom.vy = 0;
        w.pom.fallStartY = null; w.pom.bouncing = false;
        w.ready = 1;
        w.mode = 'boss';
        w.combo = 0;
        setPhase(b, 'risen');
        emit(w, 'bubblePop', { x: w.pom.x, y: w.pom.y - w.cameraY });
      }
      break;
    }
    case 'risen':
      b.risenT += dt;
      b.fireSwell = Math.max(0.3, b.fireSwell - dt);
      updateDrift(b, dt);
      spitFireballs(w, dt);
      if (b.hp === 1 && b.risenT > 6) startSink(w);
      break;
    case 'sinking':
      b.rise = HIDE * Math.min(1, (b.t) / SINK);
      updateDrift(b, dt);
      if (b.t >= SINK) setPhase(b, 'away');
      break;
    case 'away': {
      const away = Math.max(2.4, 3.0 - 0.2 * (b.stage - 1));
      if (!b.warned && b.t >= away - 1) { b.warned = true; emit(w, 'warning'); }
      b.fireSwell = Math.min(1, b.fireSwell + dt);
      if (b.t >= away) {
        setPhase(b, 'rising');
        emit(w, 'hadesRise', { first: false });
        const gap = b.gaps[b.gaps.length - 1];
        if (gap) gap.survived = true;
        // ramps inside where his head will be crumble as he rises
        b.rise = 0; const g = geom(w); b.rise = HIDE;
        for (const r of w.ramps) {
          if (r.crumbling) continue;
          const inside = [[r.x1, r.y1], [r.x, r.y], [r.x2, r.y2]].some(([x, y]) => {
            const nx = (x - g.cx) / g.rx, ny = (y - g.cy) / (g.ry + 30);
            return nx * nx + ny * ny < 1;
          });
          if (inside) crumble(w, r);
        }
      }
      break;
    }
    case 'rising':
      b.rise = HIDE * (1 - Math.min(1, b.t / RISE));
      updateDrift(b, dt);
      if (b.rise <= HIDE / 2) b.updraft = 1;
      if (b.t >= RISE) { b.rise = 0; setPhase(b, 'risen'); }
      break;
    case 'defeat':
      b.defeatT += dt;
      b.crack = Math.min(1, b.defeatT / 1.6);
      if (Math.random() < 0.5) emit(w, 'crumbleBits', { x: geom(w).cx + (Math.random() - 0.5) * 400, y: geom(w).cy - w.cameraY + (Math.random() - 0.5) * 200 });
      if (b.defeatT > 1.2) b.rise = Math.min(HIDE + 80, b.rise + dt * 260);
      b.fireSwell = Math.max(0, b.fireSwell - dt * 0.6);
      // pom floats up gently
      w.pom.vy = 0; w.pom.vx *= 0.9;
      w.pom.y -= dt * 60; w.pom.rot += dt * 2;
      if (b.defeatT > 3.2 && w.mode !== 'victory') { w.mode = 'victory'; emit(w, 'victory'); }
      break;
  }
  if (b.updraft < 1 && w.pom.vy > UPDRAFT_CAP && !w.pom.onRamp) w.pom.vy = UPDRAFT_CAP;
  updateFireballs(w, dt);
}

function setPhase(b, p) { b.phase = p; b.t = 0; b.warned = false; if (p === 'risen') b.risenT = 0; }

function updateDrift(b, dt) {
  const amp = b.hp >= 4 ? 0 : b.hp === 3 ? 90 : 120;
  const per = b.hp === 3 ? 2.5 : 1.8;
  b.driftT += dt;
  const target = amp * Math.sin(b.driftT * Math.PI * 2 / per);
  b.drift += (target - b.drift) * Math.min(1, dt * 4);
}

function startSink(w) {
  const b = w.boss;
  setPhase(b, 'sinking');
  b.updraft = UPDRAFT;
  b.gaps.push({ stage: b.stage, survived: false });
  emit(w, 'hadesVanish');
  for (const f of b.fireballs) if (!f.dead) { f.dead = true; emit(w, 'fizzle', { x: f.x, y: f.y - w.cameraY }); }
  b.fireballs = [];
}

// ---------- fireballs ----------

function spitFireballs(w, dt) {
  const b = w.boss;
  if (b.hp >= 5) return;
  const every = b.hp === 4 ? 2.4 : b.hp === 3 ? 2.0 : 1.6;
  b.fireT += dt;
  if (b.fireT < every) return;
  b.fireT = 0;
  const g = geom(w);
  const n = b.hp <= 2 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const dir = n === 2 ? (i === 0 ? -1 : 1) : (w.rng.chance(0.5) ? -1 : 1);
    b.fireballs.push({
      x: g.cx, y: g.top + HADES_H * 0.47,
      vx: dir * (80 + w.rng.next() * 160), vy: -(720 + w.rng.next() * 220),
      life: 2.5, r: 15, trail: [],
    });
  }
  emit(w, 'fireball');
}

function segDist(px, py, r) {
  const dx = r.x2 - r.x1, dy = r.y2 - r.y1;
  const t = Math.max(0, Math.min(1, ((px - r.x1) * dx + (py - r.y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (r.x1 + dx * t), py - (r.y1 + dy * t));
}

function updateFireballs(w, dt) {
  const b = w.boss;
  for (let i = b.fireballs.length - 1; i >= 0; i--) {
    const f = b.fireballs[i];
    f.life -= dt;
    f.vy += C.GRAVITY * 0.6 * dt;
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.x < f.r) { f.x = f.r; f.vx = Math.abs(f.vx); }
    if (f.x > C.W - f.r) { f.x = C.W - f.r; f.vx = -Math.abs(f.vx); }
    f.trail.push({ x: f.x, y: f.y }); if (f.trail.length > 10) f.trail.shift();
    let gone = f.life <= 0 || f.y - w.cameraY > C.dims.H + 40;
    for (const r of w.ramps) {
      if (r.passed || r.crumbling || r.isStart && w.ready > 0) continue;
      if (segDist(f.x, f.y, r) < f.r + 12) { crumble(w, r); gone = true; break; }
    }
    const p = w.pom;
    if (!gone && Math.hypot(p.x - f.x, p.y - f.y) < p.r + f.r) {
      if (p.onRamp) { p.onRamp.passed = true; p.onRamp = null; }
      p.vx = (p.x < f.x ? -1 : 1) * 350; p.vy = -250; p.bouncing = true; p.fallStartY = p.y;
      emit(w, 'knock', { x: p.x, y: p.y - w.cameraY });
      gone = true;
    }
    if (gone) { if (f.life > 0) emit(w, 'fizzle', { x: f.x, y: f.y - w.cameraY }); b.fireballs.splice(i, 1); }
  }
}

// ---------- contact ----------

// Called each physics substep while the pom is airborne. Returns true if it hit Hades.
export function bossTryHit(w) {
  const b = w.boss;
  if (w.mode !== 'boss' || !live(b)) return false;
  const p = w.pom, g = geom(w);
  const nx = (p.x - g.cx) / (g.rx + p.r * 0.6), ny = (p.y - g.cy) / (g.ry + p.r * 0.6);
  if (nx * nx + ny * ny >= 1) {
    const sx = (p.x - g.cx) / (g.srx + p.r * 0.5), sy = (p.y - g.scy) / (g.sry + p.r * 0.5);
    if (sx * sx + sy * sy < 1 && p.vy > 0) {
      p.vy = -Math.min(Math.abs(p.vy) * 0.6 + 200, 560);
      p.vx = Math.sign(p.x - g.cx || 1) * Math.max(120, Math.abs(p.vx) * 0.6);
      p.bouncing = true; p.fallStartY = p.y;
      emit(w, 'hadesDeflect', { x: p.x, y: p.y - w.cameraY });
      return true;
    }
    return false;
  }
  const dx = p.x - g.cx;
  if (p.y > g.cy - g.ry * 0.25) {
    // side / lower contact: pushed outward, never swallowed
    p.vx = (dx < 0 ? -1 : 1) * 300; p.vy = -200; p.bouncing = true; p.fallStartY = p.y;
    if (p.onRamp) { p.onRamp.passed = true; p.onRamp = null; }
    emit(w, 'hadesDeflect', { x: p.x, y: p.y - w.cameraY });
    return true;
  }
  if (p.vy < -50) return false;
  if (Math.abs(dx) > 0.75 * g.rx) {
    // brow / shoulder: knocked sideways, no damage
    p.vx = Math.sign(dx) * 300; p.vy = -400; p.bouncing = true; p.fallStartY = p.y;
    p.y = Math.min(p.y, g.cy - g.ry * Math.sqrt(Math.max(0, 1 - nx * nx)) - p.r * 0.6);
    emit(w, 'hadesDeflect', { x: p.x, y: p.y - w.cameraY });
    return true;
  }
  const drop = p.fallStartY == null ? 0 : p.y - p.fallStartY;
  const crit = drop > 300;
  let pts = HIT_PTS * 2;
  if (crit) pts += CRIT_PTS * 2;
  w.bonus += pts;
  b.hp--;
  b.stage = 6 - b.hp;
  b.flash = 1; b.hurt = 0.6;
  w.stats.hadesHits++;
  p.vy = -1000; p.vx = (C.W / 2 - p.x) * 0.4; p.bouncing = true; p.fallStartY = p.y;
  w.shake = crit ? 0.6 : 0.4;
  w.hitStop = 0.08;
  emit(w, 'hadesHit', { x: p.x, y: p.y - w.cameraY + p.r, pts, critical: crit, hp: b.hp });
  if (b.hp <= 0) {
    setPhase(b, 'defeat');
    b.defeatT = 0;
    for (const f of b.fireballs) emit(w, 'fizzle', { x: f.x, y: f.y - w.cameraY });
    b.fireballs = [];
    w.bonus += DEFEAT_PTS * 2;
    w.mode = 'boss-outro';
    emit(w, 'hadesDefeat', { pts: DEFEAT_PTS * 2 });
  } else startSink(w);
  return true;
}

// Is Hades' body under this x right now (so the fire there can't burn the pom)?
export function bossSolidAt(w, x) {
  const b = w.boss;
  if (!b || !live(b)) return false;
  // Only his head keeps the fire off you; below his shoulders is fire.
  const g = geom(w);
  return Math.abs(x - g.cx) < g.rx * 0.9 && w.pom.y < g.cy;
}

// Last-chance rescue: returns true if the blessing saved the pom.
export function bossRescue(w) {
  const b = w.boss;
  if (!b || !b.blessing || (w.mode !== 'boss')) return false;
  b.blessing = false;
  const p = w.pom;
  p.vy = -1100; p.vx = 0; p.x += Math.sign(C.W / 2 - p.x) * 60; p.bouncing = true; p.fallStartY = p.y;
  if (p.onRamp) { p.onRamp.passed = true; p.onRamp = null; }
  emit(w, 'blessing', { x: p.x, y: p.y - w.cameraY });
  return true;
}

// For the autopilot: where his head is, when it's worth aiming at.
export function bossTarget(w) {
  const b = w.boss;
  if (!b || w.mode !== 'boss' || !(b.phase === 'risen' || b.phase === 'rising')) return null;
  const g = geom(w);
  return { x: g.cx, top: g.cy - g.ry, band: 0.75 * g.rx };
}

// For the autopilot: should it hold off and let the pom drop onto Hades?
export function bossWantsFall(w, pts) {
  const b = w.boss;
  if (!b || w.mode !== 'boss' || !(b.phase === 'risen' || b.phase === 'rising')) return false;
  const g = geom(w);
  for (const pt of pts) {
    if (!pt) continue;
    if (pt.y > g.cy - g.ry && Math.abs(pt.x - g.cx) < 0.6 * g.rx) return true;
    if (pt.y > g.cy - g.ry) return false;
  }
  return false;
}

// ---------- drawing ----------

export function drawBoss(ctx, img, w, t, layer) {
  const b = w.boss;
  if (!b) return;
  const g = geom(w);
  const camY = w.cameraY;
  if (layer === 'back') {
    if (b.rise >= HIDE + 60) return;
    const key = b.hurt > 0 && img['hades-hit'] ? 'hades-hit' : 'hades-' + Math.min(5, Math.max(1, 6 - Math.max(1, b.hp)));
    const im = img[key] || img['hades-1'];
    const bob = Math.sin(t * 1.5) * 4 + (b.hurt > 0 ? Math.sin(t * 60) * 6 * b.hurt : 0);
    const shakeX = b.phase === 'defeat' ? (Math.random() - 0.5) * 12 * (1 - b.crack * 0.5) : 0;
    const x = g.left + shakeX, y = g.top + bob;
    // glow behind him
    const glow = ctx.createRadialGradient(g.cx, g.cy, 60, g.cx, g.cy, 340);
    glow.addColorStop(0, `rgba(255,90,30,${0.35 + 0.1 * Math.sin(t * 3)})`); glow.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, g.top - 120, C.W, HADES_H + 240);
    ctx.save();
    if (b.phase === 'defeat') ctx.globalAlpha = Math.max(0, 1 - Math.max(0, b.defeatT - 1.4) / 1.6);
    if (im) ctx.drawImage(im, x, y, HADES_W, HADES_H);
    else drawFallbackFace(ctx, x, y, b);
    if (b.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = b.flash * 0.7;
      if (im) ctx.drawImage(im, x, y, HADES_W, HADES_H);
    }
    ctx.restore();
    if (location.search.includes('debug=1')) {
      ctx.strokeStyle = 'lime'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'yellow'; ctx.strokeRect(g.cx - 0.6 * g.rx, g.cy - g.ry, 1.2 * g.rx, g.ry);
    }
    // heat shimmer warning before he returns
    if (b.phase === 'away' && b.warned) {
      const a = 0.4 + 0.3 * Math.sin(t * 20);
      ctx.fillStyle = `rgba(255,140,40,${a * 0.5})`;
      ctx.fillRect(0, C.dims.H - 160, C.W, 6);
    }
  } else if (layer === 'front') {
    for (const f of b.fireballs) {
      for (let i = 0; i < f.trail.length; i++) {
        const p = f.trail[i], a = i / f.trail.length;
        ctx.fillStyle = `rgba(255,${120 + 80 * a},40,${a * 0.5})`;
        ctx.beginPath(); ctx.arc(p.x, p.y - camY, f.r * a * 0.8, 0, Math.PI * 2); ctx.fill();
      }
      const im = img.fireball;
      const s = f.r * 3.2 * (1 + 0.08 * Math.sin(t * 30));
      if (im) { ctx.save(); ctx.translate(f.x, f.y - camY); ctx.rotate(Math.atan2(f.vy, f.vx) + Math.PI / 2); ctx.drawImage(im, -s / 2, -s / 2, s, s); ctx.restore(); }
      else { ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.arc(f.x, f.y - camY, f.r, 0, Math.PI * 2); ctx.fill(); }
    }
    if (b.phase === 'intro') {
      const x = w.pom.x, y = w.pom.y - camY, r = w.pom.r * 1.9 + Math.sin(t * 6) * 3;
      const gr = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      gr.addColorStop(0, 'rgba(255,250,220,0.35)'); gr.addColorStop(0.8, 'rgba(255,215,100,0.18)'); gr.addColorStop(1, 'rgba(255,215,100,0.6)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,180,0.9)'; ctx.lineWidth = 3; ctx.stroke();
    }
    if (b.updraft < 1) {
      ctx.fillStyle = 'rgba(255,170,80,0.10)';
      for (let i = 0; i < 6; i++) {
        const xx = (i * 97 + t * 40) % C.W, yy = C.dims.H - ((t * 260 + i * 160) % (C.dims.H - 100));
        ctx.fillRect(xx, yy, 3, 40);
      }
    }
  }
}

function drawFallbackFace(ctx, x, y, b) {
  ctx.save();
  ctx.fillStyle = '#6b5a4a';
  ctx.beginPath(); ctx.ellipse(x + HADES_W / 2, y + HADES_H * 0.55, HADES_W * 0.42, HADES_H * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1010';
  ctx.beginPath(); ctx.ellipse(x + HADES_W / 2, y + HADES_H * 0.85, HADES_W * 0.3, HADES_H * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = b.hp <= 3 ? '#ff4010' : '#ff9a30';
  ctx.beginPath(); ctx.ellipse(x + HADES_W * 0.38, y + HADES_H * 0.45, 30, 16, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + HADES_W * 0.62, y + HADES_H * 0.45, 30, 16, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#20141c';
  ctx.fillRect(x + HADES_W * 0.25, y + HADES_H * 0.08, HADES_W * 0.5, 40);
  ctx.restore();
}

export function drawBossHud(ctx, img, w, t) {
  const b = w.boss;
  const y = 158, x0 = C.W / 2 - 80;
  ctx.fillStyle = 'rgba(20,10,35,0.55)';
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0 - 26, y - 20, 212, 40, 20) : ctx.rect(x0 - 26, y - 20, 212, 40); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const on = i < b.hp, x = x0 + i * 32;
    ctx.globalAlpha = on ? 1 : 0.22;
    const s = 30 + (on ? Math.sin(t * 8 + i) * 2 : 0);
    if (img.fireball) ctx.drawImage(img.fireball, x - s / 2, y - s / 2, s, s);
    else { ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = b.blessing ? 1 : 0.2;
  const fx = x0 + 5 * 32 + 6;
  if (img.flower) ctx.drawImage(img.flower, fx - 15, y - 15, 30, 30);
  else { ctx.fillStyle = '#9dffb0'; ctx.beginPath(); ctx.arc(fx, y, 9, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}
