// Particles, floating text and other short-lived effects, in world coordinates.
export function createFx() {
  return { parts: [], texts: [], flashes: [], toasts: [] };
}

export function burst(fx, x, y, { n = 12, color = '#ffd25a', speed = 220, life = 0.6, size = 4, gravity = 300, kind = 'dot', spread = Math.PI * 2, dir = -Math.PI / 2 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = spread >= Math.PI * 2 ? Math.random() * Math.PI * 2 : dir + (Math.random() - 0.5) * spread;
    const v = speed * (0.4 + Math.random() * 0.6);
    fx.parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life,
      size: size * (0.6 + Math.random() * 0.8), color, gravity, kind, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10,
    });
  }
}

export function floatText(fx, x, y, text, { color = '#fff6d8', size = 30, life = 1.1, rise = 70, big = false } = {}) {
  fx.texts.push({ x, y, text, color, size, life, max: life, rise, big });
}

export function toast(fx, text, life = 3) {
  fx.toasts.push({ text, life, max: life });
}

export function updateFx(fx, dt) {
  for (let i = fx.parts.length - 1; i >= 0; i--) {
    const p = fx.parts[i];
    p.life -= dt;
    if (p.life <= 0) { fx.parts.splice(i, 1); continue; }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.kind === 'dust') { p.vx *= 0.94; p.vy *= 0.94; }
  }
  for (let i = fx.texts.length - 1; i >= 0; i--) {
    const t = fx.texts[i];
    t.life -= dt;
    if (t.life <= 0) fx.texts.splice(i, 1);
  }
  for (let i = fx.toasts.length - 1; i >= 0; i--) {
    fx.toasts[i].life -= dt;
    if (fx.toasts[i].life <= 0) fx.toasts.splice(i, 1);
  }
  if (fx.parts.length > 600) fx.parts.splice(0, fx.parts.length - 600);
}
