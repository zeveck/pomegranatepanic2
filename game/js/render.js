// Drawing the world and HUD. Every sprite has a code-drawn fallback.
import * as C from './config.js';

export const FONT_TITLE = "'Cinzel Decorative', Georgia, serif";
export const FONT = "Nunito, system-ui, sans-serif";

export const IMAGES = {
  pom: 'assets/sprites/pom.png',
  'pom-gold': 'assets/sprites/pom-gold.png',
  'ramp-cap': 'assets/items/ramp-cap.png',
  'ramp-mid': 'assets/items/ramp-mid.png',
  'bumper-s': 'assets/items/bumper-s.png',
  'bumper-m': 'assets/items/bumper-m.png',
  'bumper-l': 'assets/items/bumper-l.png',
  'bumper-j': 'assets/items/bumper-j.png',
  seed: 'assets/items/seed.png',
  fireball: 'assets/items/fireball.png',
  coin: 'assets/items/coin.png',
  flower: 'assets/items/flower.png',
  laurel: 'assets/ui/laurel.png',
  'bg-far': 'assets/bg/bg-far.jpg',
  walls: 'assets/bg/walls.png',
  title: 'assets/bg/title.jpg',
  victory: 'assets/bg/victory.jpg',
  'hades-1': 'assets/sprites/hades-1.png',
  'hades-2': 'assets/sprites/hades-2.png',
  'hades-3': 'assets/sprites/hades-3.png',
  'hades-4': 'assets/sprites/hades-4.png',
  'hades-5': 'assets/sprites/hades-5.png',
  'hades-hit': 'assets/sprites/hades-hit.png',
  'persephone-0': 'assets/sprites/persephone/persephone-0.png',
  'persephone-1': 'assets/sprites/persephone/persephone-1.png',
  'persephone-2': 'assets/sprites/persephone/persephone-2.png',
  'persephone-3': 'assets/sprites/persephone/persephone-3.png',
};

export function loadImages() {
  const img = {};
  const jobs = Object.entries(IMAGES).map(([k, src]) => new Promise(res => {
    const im = new Image();
    im.onload = () => { img[k] = im; res(); };
    im.onerror = () => res();
    im.src = src;
  }));
  return Promise.all(jobs).then(() => img);
}

// ---------- helpers ----------

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx, str, x, y, { size = 28, color = '#fff6d8', align = 'center', font = FONT, weight = 800, stroke = 'rgba(20,10,30,0.85)', strokeW = 0, baseline = 'middle', alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const sw = strokeW || Math.max(3, size * 0.16);
  if (stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function drawCentered(ctx, im, x, y, w, h, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// ---------- background ----------

export function drawBackground(ctx, img, camY, depth, t, ember) {
  const H = C.dims.H, W = C.W;
  const bg = img['bg-far'];
  if (bg) {
    const h = W * bg.height / bg.width;
    const off = ((camY * 0.3) % h + h) % h;
    for (let y = -off; y < H; y += h) ctx.drawImage(bg, 0, y, W, h + 1);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#231a44'); g.addColorStop(1, '#1b1433');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(80,60,130,0.25)';
    for (let i = 0; i < 14; i++) {
      const yy = ((i * 173 - camY * 0.3) % (H + 200) + H + 200) % (H + 200) - 100;
      ctx.beginPath(); ctx.ellipse((i * 97) % W, yy, 60, 22, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // deeper = more plum
  const k = Math.min(1, depth);
  if (k > 0) { ctx.fillStyle = `rgba(90,10,60,${0.32 * k})`; ctx.fillRect(0, 0, W, H); }
  const walls = img.walls;
  if (walls) {
    const h = W * walls.height / walls.width;
    const off = ((camY * 0.65) % h + h) % h;
    const ww = W * 1.14; // push the rock a little past the play edges
    for (let y = -off; y < H; y += h) ctx.drawImage(walls, (W - ww) / 2, y, ww, h + 1);
  }
  // drifting embers
  for (const e of ember) {
    ctx.globalAlpha = e.a * (0.6 + 0.4 * Math.sin(t * 3 + e.ph));
    ctx.fillStyle = e.c;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function makeEmbers(n = 40) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(newEmber(true));
  return out;
}
function newEmber(any) {
  const H = C.dims.H;
  return {
    x: Math.random() * C.W, y: any ? Math.random() * H : H + 10,
    vy: -(20 + Math.random() * 50), vx: (Math.random() - 0.5) * 12,
    r: 1 + Math.random() * 2.2, a: 0.3 + Math.random() * 0.5, ph: Math.random() * 6,
    c: Math.random() < 0.7 ? '#ff9a3c' : '#ffd25a',
  };
}
export function updateEmbers(ember, dt, camVel) {
  for (let i = 0; i < ember.length; i++) {
    const e = ember[i];
    e.y += (e.vy - camVel * 0.5) * dt; e.x += e.vx * dt;
    if (e.y < -10 || e.y > C.dims.H + 20) ember[i] = newEmber(false);
  }
}

// ---------- fire band ----------

export function makeFire() {
  const parts = [];
  for (let i = 0; i < 70; i++) parts.push(newFlame(true));
  return parts;
}
function newFlame(any) {
  return { x: Math.random() * C.W, age: any ? Math.random() : 0, life: 0.6 + Math.random() * 0.7, w: 18 + Math.random() * 30, h: 50 + Math.random() * 70, hue: Math.random() * 40 };
}
export function drawFire(ctx, parts, dt, intensity = 0, swell = 0) {
  const H = C.dims.H, W = C.W;
  const base = H;
  const scaleH = 1 + intensity * 1.6 + swell * 0.8;
  const g = ctx.createLinearGradient(0, base - 110 * scaleH, 0, base);
  g.addColorStop(0, 'rgba(255,90,20,0)');
  g.addColorStop(0.55, `rgba(255,90,20,${0.35 + intensity * 0.3})`);
  g.addColorStop(1, 'rgba(255,200,80,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, base - 110 * scaleH, W, 110 * scaleH);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    p.age += dt / p.life;
    if (p.age >= 1) { parts[i] = newFlame(false); continue; }
    const k = Math.sin(p.age * Math.PI);
    const h = p.h * k * scaleH, w = p.w * (1 - p.age * 0.5);
    const y = base - h * 0.5 - p.age * 30 * scaleH;
    const grd = ctx.createRadialGradient(p.x, y, 0, p.x, y, Math.max(w, h) * 0.6);
    grd.addColorStop(0, `hsla(${30 + p.hue},100%,62%,${0.55 * k})`);
    grd.addColorStop(1, `hsla(${p.hue},100%,45%,0)`);
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(p.x, y, w * 0.6, h * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ---------- world objects ----------

export function drawRamp(ctx, img, r, camY) {
  const y = r.y - camY - (r.drop || 0) * 10;
  ctx.save();
  ctx.globalAlpha = Math.max(0, r.opacity) * (r.ghost ? 0.5 : 1);
  ctx.translate(r.x, y);
  ctx.rotate(r.rad);
  const L = r.length + 10, T = 26;
  const cap = img['ramp-cap'], mid = img['ramp-mid'];
  if (r.ghost) {
    ctx.fillStyle = r.blocked ? 'rgba(170,170,190,0.55)' : 'rgba(255,240,200,0.6)';
    ctx.strokeStyle = r.blocked ? 'rgba(120,120,140,0.9)' : 'rgba(255,210,90,0.95)';
    ctx.setLineDash([10, 6]); ctx.lineWidth = 3;
    roundRect(ctx, -L / 2, -T / 2, L, T, T / 2); ctx.fill(); ctx.stroke();
  } else if (cap && mid) {
    const cw = T * cap.width / cap.height;
    const midW = Math.max(0, L - cw * 2);
    const tileW = T * mid.width / mid.height;
    for (let x = -L / 2 + cw; x < L / 2 - cw - 0.5; x += tileW) {
      const w = Math.min(tileW, L / 2 - cw - x);
      ctx.drawImage(mid, 0, 0, mid.width * (w / tileW), mid.height, x, -T / 2, w + 0.6, T);
    }
    if (midW < 0) { /* very short: caps overlap */ }
    ctx.drawImage(cap, -L / 2, -T / 2, cw, T);
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(cap, -L / 2, -T / 2, cw, T); ctx.restore();
  } else {
    const g = ctx.createLinearGradient(0, -T / 2, 0, T / 2);
    g.addColorStop(0, '#fbf6ea'); g.addColorStop(0.5, '#e2d8c4'); g.addColorStop(1, '#b6a88e');
    ctx.fillStyle = g;
    roundRect(ctx, -L / 2, -T / 2, L, T, 9); ctx.fill();
    ctx.fillStyle = '#d9a640';
    ctx.fillRect(-L / 2 + 8, -T / 2 + 3, L - 16, 3);
    ctx.fillRect(-L / 2 + 8, T / 2 - 6, L - 16, 3);
    ctx.strokeStyle = '#3a2a40'; ctx.lineWidth = 2;
    roundRect(ctx, -L / 2, -T / 2, L, T, 9); ctx.stroke();
  }
  if (r.burning > 0 || r.crumbling) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,90,20,0.55)';
    ctx.fillRect(-L / 2, -T / 2, L, T);
  }
  ctx.restore();
}

export function drawBumper(ctx, img, b, camY, t) {
  const y = b.y - camY;
  if (y < -120 || y > C.dims.H + 120) return;
  const pop = b.popping != null ? b.popping : 0;
  const s = (1 - (b.recoil > 0 ? (1 - 0.85) * Math.sin((b.recoil / 0.15) * Math.PI) : 0)) * (1 + pop * 0.5);
  const key = b.jackpot ? 'bumper-j' : C.BUMPERS[b.kind].img;
  ctx.save();
  ctx.globalAlpha = 1 - pop;
  const pulse = 0.5 + 0.5 * Math.sin(b.pulse);
  // glow
  const glowC = b.jackpot ? '255,210,90' : b.kind === 'small' ? '90,150,255' : b.kind === 'medium' ? '80,230,210' : '200,120,255';
  const gr = ctx.createRadialGradient(b.x, y, b.r * 0.6, b.x, y, b.r * 1.6);
  gr.addColorStop(0, `rgba(${glowC},${0.25 + 0.25 * pulse + b.light * 2})`);
  gr.addColorStop(1, `rgba(${glowC},0)`);
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(b.x, y, b.r * 1.6, 0, Math.PI * 2); ctx.fill();
  const im = img[key];
  const d = b.r * 2 * (b.jackpot ? 1.4 : 1.08) * s;
  if (im) drawCentered(ctx, im, b.x, y, d, d, b.jackpot ? Math.sin(t * 2) * 0.08 : 0);
  else {
    const col = b.jackpot ? '#ffcf3a' : b.kind === 'small' ? '#2f5fb5' : C.BUMPERS[b.kind].color;
    ctx.fillStyle = '#b5713a'; ctx.beginPath(); ctx.arc(b.x, y, b.r * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(b.x, y, b.r * s * 0.78, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.25, y - b.r * 0.3, b.r * 0.25, 0, Math.PI * 2); ctx.fill();
  }
  if (b.light > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,255,230,${b.light * 2.2})`;
    ctx.beginPath(); ctx.arc(b.x, y, b.r * s * 0.95, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  if (b.jackpot && b.popping == null) text(ctx, String(b.hits), b.x, y + 2, { size: 30, color: '#fff6d8', weight: 900 });
}

export function drawSeed(ctx, img, s, camY, t) {
  const y = s.y - camY;
  const H = C.dims.H;
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  if (y > H + 10) {
    // arrow at the bottom edge pointing at the seed below
    const ay = H - C.FIRE_H - 34 + Math.sin(t * 6) * 5;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ff4d6a';
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(s.x, ay + 18); ctx.lineTo(s.x - 16, ay); ctx.lineTo(s.x + 16, ay); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    text(ctx, 'seed', s.x, ay - 16, { size: 18, color: '#ffe9a8' });
    return;
  }
  const gr = ctx.createRadialGradient(s.x, y, 4, s.x, y, 46 + pulse * 10);
  gr.addColorStop(0, 'rgba(255,90,120,0.75)'); gr.addColorStop(1, 'rgba(255,60,90,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(s.x, y, 56, 0, Math.PI * 2); ctx.fill();
  drawSeedIcon(ctx, img, s.x, y + Math.sin(t * 3) * 3, C.SEED_R * 2.6 * (1 + pulse * 0.08), Math.sin(t * 2) * 0.2);
}

export function drawSeedIcon(ctx, img, x, y, size, rot = 0, empty = false) {
  const im = img.seed;
  ctx.save();
  if (empty) {
    ctx.strokeStyle = 'rgba(243,220,138,0.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, size * 0.26, size * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.3;
  }
  if (im) drawCentered(ctx, im, x, y, size, size, rot);
  else {
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = empty ? '#664' : '#ff2e4d';
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, size * 0.3, size * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(-size * 0.08, -size * 0.14, size * 0.07, size * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawPom(ctx, img, pom, camY, golden, t, extraScale = 1) {
  const x = pom.x, y = pom.y - camY;
  const r = pom.r * extraScale;
  const sq = pom.squash || 0;
  const sx = 1 + sq * 0.18, sy = 1 - sq * 0.16;
  if (golden) {
    const gr = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.4);
    gr.addColorStop(0, 'rgba(255,220,100,0.55)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y + r * (1 - sy));
  ctx.scale(sx, sy);
  const im = img[golden ? 'pom-gold' : 'pom'];
  const d = r * 2 / 0.621; // sprite is centred on the fruit body; body radius = 0.621 of half-size
  ctx.save();
  ctx.rotate(pom.rot);
  if (im) ctx.drawImage(im, -d / 2, -d / 2, d, d);
  else {
    ctx.fillStyle = golden ? '#e8b22e' : '#c0182c';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = golden ? '#a87a10' : '#7a0e1c';
    ctx.beginPath(); ctx.moveTo(-7, -r + 2); ctx.lineTo(-9, -r - 9); ctx.lineTo(-3, -r - 4); ctx.lineTo(0, -r - 11); ctx.lineTo(3, -r - 4); ctx.lineTo(9, -r - 9); ctx.lineTo(7, -r + 2); ctx.fill();
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  // fixed lighting over the spinning fruit
  const hl = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, -r * 0.1, -r * 0.1, r * 1.05);
  hl.addColorStop(0, 'rgba(255,255,255,0.45)');
  hl.addColorStop(0.35, 'rgba(255,255,255,0.08)');
  hl.addColorStop(0.75, 'rgba(0,0,0,0)');
  hl.addColorStop(1, 'rgba(20,0,30,0.35)');
  ctx.fillStyle = hl;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (golden && Math.random() < 0.5) { /* sparkle trail spawned by main */ }
}

export function drawParticles(ctx, fx, camY, img) {
  for (const p of fx.parts) {
    const a = Math.max(0, p.life / p.max);
    const y = p.y - camY;
    ctx.globalAlpha = a;
    if (p.kind === 'coin' && img.coin) {
      drawCentered(ctx, img.coin, p.x, y, p.size * 5, p.size * 5, p.rot);
    } else if (p.kind === 'spark') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;
      ctx.translate(p.x, y); ctx.rotate(p.rot);
      ctx.fillRect(-p.size, -p.size * 0.25, p.size * 2, p.size * 0.5);
      ctx.fillRect(-p.size * 0.25, -p.size, p.size * 0.5, p.size * 2);
      ctx.restore();
    } else if (p.kind === 'dust') {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'chunk') {
      ctx.save(); ctx.fillStyle = p.color; ctx.translate(p.x, y); ctx.rotate(p.rot);
      ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2); ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, y, p.size * a + 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawTexts(ctx, fx, camY) {
  for (const t of fx.texts) {
    const k = 1 - t.life / t.max;
    const pop = k < 0.12 ? 0.6 + k / 0.12 * 0.5 : 1.1 - Math.min(0.1, (k - 0.12));
    const y = t.y - camY - t.rise * Math.sqrt(k);
    text(ctx, t.text, t.x, y, { size: t.size * pop, color: t.color, weight: 900, alpha: Math.min(1, t.life / t.max * 2.5) });
  }
}
