// Buttons, panels and HUD pieces drawn on the canvas.
import { roundRect, text, FONT, FONT_TITLE, drawSeedIcon } from './render.js';
import * as C from './config.js';

export function button(ctx, b, t, hover) {
  const { x, y, w, h, label } = b;
  const primary = b.style !== 'ghost' && b.style !== 'small';
  ctx.save();
  const press = b.pressed ? 2 : 0;
  // bronze roundel / panel
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (primary) { g.addColorStop(0, '#ffdf7a'); g.addColorStop(0.5, '#e9a93a'); g.addColorStop(1, '#b8721f'); }
  else { g.addColorStop(0, 'rgba(70,52,110,0.95)'); g.addColorStop(1, 'rgba(40,28,70,0.95)'); }
  ctx.fillStyle = g;
  roundRect(ctx, x, y + press, w, h, Math.min(h / 2, 22)); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3;
  ctx.strokeStyle = primary ? '#fff2c0' : (hover ? '#ffd25a' : '#a98fd6');
  roundRect(ctx, x + 1.5, y + 1.5 + press, w - 3, h - 3, Math.min(h / 2, 22)); ctx.stroke();
  ctx.restore();
  if (b.icon) drawIcon(ctx, b.icon, x + w / 2, y + h / 2 + press, Math.min(w, h) * 0.5, b.off);
  else text(ctx, label, x + w / 2, y + h / 2 + 2 + press, {
    size: b.size || (primary ? 30 : 24), color: primary ? '#3a1408' : '#fff6d8', stroke: primary ? null : 'rgba(10,5,20,0.8)', weight: 900,
  });
}

export function drawIcon(ctx, icon, x, y, s, off) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#ffe9a8'; ctx.fillStyle = '#ffe9a8'; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (icon === 'pause') {
    ctx.fillRect(-s * 0.32, -s * 0.38, s * 0.22, s * 0.76);
    ctx.fillRect(s * 0.1, -s * 0.38, s * 0.22, s * 0.76);
  } else if (icon === 'music') {
    ctx.beginPath(); ctx.ellipse(-s * 0.22, s * 0.28, s * 0.16, s * 0.12, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.26, s * 0.16, s * 0.16, s * 0.12, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.08, s * 0.26); ctx.lineTo(-s * 0.08, -s * 0.36); ctx.lineTo(s * 0.4, -s * 0.48); ctx.lineTo(s * 0.4, s * 0.14); ctx.stroke();
  } else if (icon === 'sound') {
    ctx.beginPath(); ctx.moveTo(-s * 0.42, -s * 0.14); ctx.lineTo(-s * 0.2, -s * 0.14); ctx.lineTo(s * 0.06, -s * 0.38); ctx.lineTo(s * 0.06, s * 0.38); ctx.lineTo(-s * 0.2, s * 0.14); ctx.lineTo(-s * 0.42, s * 0.14); ctx.closePath(); ctx.fill();
    if (!off) {
      ctx.beginPath(); ctx.arc(s * 0.1, 0, s * 0.22, -0.8, 0.8); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.1, 0, s * 0.4, -0.8, 0.8); ctx.stroke();
    }
  } else if (icon === 'up' || icon === 'down') {
    ctx.beginPath();
    const d = icon === 'up' ? -1 : 1;
    ctx.moveTo(-s * 0.4, -d * s * 0.18); ctx.lineTo(0, d * s * 0.26); ctx.lineTo(s * 0.4, -d * s * 0.18); ctx.stroke();
  }
  if (off) {
    ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = s * 0.14;
    ctx.beginPath(); ctx.moveTo(-s * 0.48, -s * 0.48); ctx.lineTo(s * 0.48, s * 0.48); ctx.stroke();
  }
  ctx.restore();
}

export function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(46,32,84,0.96)'); g.addColorStop(1, 'rgba(24,16,48,0.96)');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, 26); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#d9a640'; ctx.lineWidth = 4;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 24); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,140,0.35)'; ctx.lineWidth = 2;
  roundRect(ctx, x + 10, y + 10, w - 20, h - 20, 18); ctx.stroke();
  ctx.restore();
}

export function hit(b, x, y) {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

export function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}

export function seedPips(ctx, img, x, y, n, size = 26, gap = 30) {
  for (let i = 0; i < C.MAX_SEEDS; i++) {
    drawSeedIcon(ctx, img, x + i * gap, y, size, 0, i >= n);
  }
}

export function titleText(ctx, str, x, y, size, color = '#ffd25a') {
  text(ctx, str, x, y, { size, font: FONT_TITLE, weight: 900, color, stroke: '#2a0f1e', strokeW: size * 0.18 });
}

export { FONT, FONT_TITLE };
