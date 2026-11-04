// Boot, loop, screens, and the glue between world, input, audio and drawing.
import * as C from './config.js';
import { createWorld, update as updateWorld, tryPlace, clampAim, makeRamp, startBossIntro } from './world.js';
import { drawBoss, drawBossHud } from './boss.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { save, BOARD_THRESHOLD } from './save.js';
import { randomSeed } from './rng.js';
import { createFx, burst, floatText, toast, updateFx } from './fx.js';
import * as R from './render.js';
import { button, panel, hit, fmt, seedPips, titleText, drawIcon } from './ui.js';
import { autopilotTick } from './autopilot.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const view = { scale: 1, ox: 0, oy: 0, dpr: 1, cw: 0, ch: 0 };
const input = createInput(canvas, view);
const audio = createAudio(save);
let img = {};

const g = {
  screen: 'loading', // loading, title, help, play, pause, over, victory, scores
  world: null, fx: createFx(), embers: [], fire: [],
  t: 0, screenT: 0, buttons: [], paused: false,
  helpPage: 0, entry: null, lastRun: null, newBest: false,
  autopilot: false, seedParam: null, fireFlare: 0, firstRun: !save.get().seenHelp,
  hint: 0, flash: 0, victoryT: 0, rotateNote: false,
};

// ---------- sizing ----------

const midRun = () => ['play', 'over', 'victory'].includes(g.screen);

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const cw = window.innerWidth, ch = window.innerHeight;
  if (!(cw > 0 && ch > 0)) return;
  // logical height grows to fill tall phones (kept fixed during a run)
  if (!midRun()) C.dims.H = Math.round(Math.max(C.H_MIN, Math.min(C.H_MAX, C.W * ch / cw)));
  const scale = Math.min(cw / C.W, ch / C.dims.H);
  view.scale = scale; view.dpr = dpr; view.cw = cw; view.ch = ch;
  view.ox = Math.floor((cw - C.W * scale) / 2);
  view.oy = Math.floor((ch - C.dims.H * scale) / 2);
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  g.rotateNote = input.isTouch && cw > ch * 1.1;
  // notch / home bar, in logical units, beyond what the letterbox already leaves
  const probe = document.getElementById('safe');
  const css = probe ? getComputedStyle(probe) : null;
  const st = css ? parseFloat(css.paddingTop) || 0 : 0, sb = css ? parseFloat(css.paddingBottom) || 0 : 0;
  g.safeTop = Math.max(0, st - view.oy) / scale;
  g.safeBottom = Math.max(0, sb - view.oy) / scale;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

// ---------- screens ----------

function go(screen) {
  g.screen = screen;
  g.screenT = 0;
  if (!midRun()) resize();
  if (screen === 'title' || screen === 'scores' || screen === 'help') audio.music('title');
  if (screen === 'title') audio.ambient(false);
}

function newRun(seed) {
  g.world = createWorld(seed ?? g.seedParam ?? randomSeed());
  g.fx = createFx();
  g.fireFlare = 0;
  g.entry = null;
  g.lastRun = null;
  g.newBest = false;
  g.hint = g.firstRun ? 1 : 0;
  g.victoryT = 0;
  audio.setRate(1);
  audio.music('descent');
  audio.free('title');
  audio.ambient(true, 0.22);
  go('play');
}

function startPlay() {
  newRun();
}

function pause() {
  if (g.screen !== 'play') return;
  go('pause');
  audio.duck(true);
}
function resume() {
  if (g.screen !== 'pause') return;
  g.screen = 'play';
  audio.duck(false);
}

function endRun(won) {
  const w = g.world;
  const run = { score: w.score, seeds: w.seeds, beatHades: won, initials: '' };
  g.lastRun = run;
  g.newBest = save.noteBest(run.score);
  const rank = save.boardRank(run);
  g.entry = rank >= 0 ? { rank, letters: ['A', 'A', 'A'], cursor: 0, saved: false, skipped: false } : null;
  if (!won) { audio.music(null); audio.play('gameover'); }
  if (g.entry) setTimeout(() => audio.play('highscore'), won ? 400 : 1600);
  audio.ambient(false);
  go(won ? 'victory' : 'over');
}

// ---------- game events → sound + effects ----------

function onEvents(w) {
  const fx = g.fx;
  const cam = w.cameraY;
  for (const e of w.events) {
    const wy = e.y != null ? e.y + cam : 0;
    switch (e.type) {
      case 'place':
        audio.play('place', { vary: 0.06, vol: 0.8 });
        burst(fx, e.x, wy + 8, { n: 8, color: 'rgba(230,220,200,0.6)', speed: 90, life: 0.45, size: 6, gravity: -20, kind: 'dust', spread: Math.PI, dir: Math.PI / 2 });
        g.hint = 0;
        break;
      case 'deny': audio.play('deny', { vol: 0.6 }); break;
      case 'land': if (!e.soft) audio.play('land', { vary: 0.08, vol: 0.6 }); break;
      case 'wall': audio.play('wall', { vary: 0.1, vol: 0.4 }); break;
      case 'bounce':
        audio.play('bounce', { vary: 0.05 });
        if (e.combo >= 2) audio.play('combo', { rate: Math.min(2, 1 + (e.combo - 2) * 0.08), vol: 0.7 });
        burst(fx, e.x, wy + 20, { n: 10, color: '#ffd25a', speed: 160, life: 0.5, size: 3, kind: 'spark', spread: Math.PI, dir: -Math.PI / 2 });
        if (e.combo >= 2) floatText(fx, e.x, wy - 46, `${e.combo}x COMBO!`, { color: '#ffd25a', size: 26 + Math.min(e.combo, 10) * 2 });
        if (e.pts > 0) floatText(fx, e.x, wy - 18, `+${fmt(e.pts)}`, { size: 24 });
        break;
      case 'bumper':
        audio.play('bumper', { vary: 0.06, rate: e.kind === 'small' ? 1.12 : e.kind === 'large' ? 0.88 : 1 });
        if (e.combo >= 2) audio.play('combo', { rate: Math.min(2, 1 + (e.combo - 2) * 0.08), vol: 0.6 });
        burst(fx, e.x, wy, { n: 14, color: '#fff2c0', speed: 260, life: 0.45, size: 4, kind: 'spark' });
        floatText(fx, e.x, wy - 50, `+${fmt(e.pts)}`, { size: 28 });
        if (e.combo >= 2) floatText(fx, e.x, wy - 82, `${e.combo}x COMBO!`, { color: '#ffd25a', size: 26 + Math.min(e.combo, 10) * 2 });
        w.shake = Math.max(w.shake, 0.08);
        break;
      case 'jackpotHit':
        audio.play('jackpot-hit', { rate: 1 + (5 - e.left) * 0.06 });
        burst(fx, e.x, wy, { n: 18, color: '#ffd25a', speed: 300, life: 0.6, size: 5, kind: 'spark' });
        floatText(fx, e.x, wy - 70, `+${fmt(e.pts)}`, { size: 34, color: '#ffd25a' });
        w.shake = Math.max(w.shake, 0.15);
        break;
      case 'jackpot':
        audio.play('jackpot-burst');
        burst(fx, e.x, wy, { n: 26, color: '#ffd25a', speed: 420, life: 1.1, size: 6, kind: 'coin', gravity: 700 });
        burst(fx, e.x, wy, { n: 24, color: '#fff2c0', speed: 360, life: 0.7, size: 6, kind: 'spark' });
        floatText(fx, e.x, wy - 80, `JACKPOT! +${fmt(e.pts)}`, { size: 38, color: '#ffd25a', life: 1.6 });
        w.shake = 0.3;
        break;
      case 'seedSpawn':
        if (!g.seenSeedTip) { g.seenSeedTip = true; toast(fx, 'A seed! Steer the pom into it. Six wakes Hades…', 3.5); }
        break;
      case 'seed':
        audio.play('seed');
        burst(fx, e.x, wy, { n: 22, color: '#ff6b85', speed: 260, life: 0.8, size: 5, kind: 'spark' });
        floatText(fx, e.x, wy - 60, `SEED ${e.n}/6`, { size: 34, color: '#ff8aa0', life: 1.4 });
        floatText(fx, e.x, wy - 26, `+${fmt(e.pts)}`, { size: 28 });
        g.seedFly = { x: e.x, y: e.y, n: e.n, t: 0 };
        break;
      case 'golden':
        audio.play('golden');
        burst(fx, e.x, wy, { n: 40, color: '#ffe27a', speed: 380, life: 1.2, size: 6, kind: 'spark' });
        g.flash = 0.6;
        break;
      case 'bossIntro':
        audio.play('quake');
        audio.music(null);
        toast(fx, 'The ground shakes… HADES RISES!', 3);
        break;
      case 'hadesRise':
        audio.play('hades-rise');
        if (e.first) audio.music('hades');
        w.shake = Math.max(w.shake, 0.6);
        break;
      case 'warning': audio.play('warning', { vol: 0.8 }); break;
      case 'hadesHit':
        audio.play('hades-hit');
        burst(fx, e.x, wy, { n: 30, color: '#ffd25a', speed: 420, life: 0.8, size: 6, kind: 'spark' });
        burst(fx, e.x, wy, { n: 16, color: '#ff7a1a', speed: 300, life: 0.9, size: 5 });
        if (e.critical) audio.play('critical');
        floatText(fx, e.x, wy - 70, e.critical ? 'CRITICAL!' : 'BONK!', { size: e.critical ? 46 : 40, color: e.critical ? '#ff8a3a' : '#fff6d8', life: 1.3 });
        floatText(fx, e.x, wy - 30, `+${fmt(e.pts)}`, { size: 30, color: '#ffd25a' });
        g.flash = 0.25;
        break;
      case 'hadesDeflect': audio.play('wall', { vol: 0.7, rate: 0.7 }); break;
      case 'hadesVanish': audio.play('hades-vanish'); break;
      case 'fireball': audio.play('fireball', { vary: 0.08, vol: 0.7 }); break;
      case 'knock': audio.play('knock'); burst(fx, e.x, wy, { n: 12, color: '#ff9a3c', speed: 200, life: 0.5, size: 4 }); break;
      case 'crumble':
        audio.play('crumble', { vary: 0.08, vol: 0.7 });
        burst(fx, e.x, wy, { n: 14, color: '#d8ccb4', speed: 160, life: 0.8, size: 5, kind: 'chunk', gravity: 600 });
        break;
      case 'blessing':
        audio.play('blessing');
        burst(fx, e.x, wy, { n: 30, color: '#9dffb0', speed: 340, life: 1.0, size: 6, kind: 'spark' });
        toast(fx, "Persephone's blessing saved you! (once)", 2.5);
        g.flash = 0.3;
        break;
      case 'hadesDefeat':
        audio.play('hades-defeat');
        audio.music(null);
        audio.ambient(false);
        w.shake = 1.2;
        break;
      case 'victory':
        audio.setRate(1);
        audio.music('victory');
        endRun(true);
        break;
      case 'fizzle':
        burst(fx, e.x, wy, { n: 8, color: 'rgba(120,100,110,0.7)', speed: 80, life: 0.5, size: 6, gravity: -60, kind: 'dust' });
        break;
      case 'bubblePop':
        audio.play('seed', { rate: 0.8 });
        burst(fx, e.x, wy, { n: 24, color: '#fff2c0', speed: 260, life: 0.6, size: 4, kind: 'spark' });
        if (!g.seenBossTip) { g.seenBossTip = true; toast(fx, 'Drop onto the MIDDLE of his face!', 3.5); }
        break;
      case 'crumbleBits':
        burst(fx, e.x, wy, { n: 3, color: Math.random() < 0.5 ? '#6b5a4a' : '#ff9a3c', speed: 200, life: 0.9, size: 6, kind: 'chunk', gravity: 500 });
        break;
      case 'burn':
        audio.play('burn');
        burst(fx, e.x, wy, { n: 30, color: '#ff9a3c', speed: 320, life: 0.8, size: 6 });
        g.fireFlare = 1;
        break;
      case 'gameover':
        endRun(false);
        break;
    }
  }
  w.events.length = 0;
}

// ---------- input handling ----------

function handleInput(dt) {
  input.update(dt);
  const { presses, keys } = input.drain();
  for (const k of keys) onKey(k);
  for (const p of presses) onPress(p);
}

function buttonAt(x, y) {
  for (let i = g.buttons.length - 1; i >= 0; i--) if (hit(g.buttons[i], x, y)) return g.buttons[i];
  return null;
}

function onPress(p) {
  if (g.screen === 'loading' || g.rotateNote) return;
  if (p.kind === 'cancel') { g.downOnButton = null; return; }
  // Buttons act on mouse down / touch release.
  const isAct = p.touch ? p.kind === 'release' : p.kind === 'down';
  const isTouchDown = p.touch && p.kind === 'down';
  const bx = p.x, by = p.touch ? (p.rawY ?? p.y) : p.y;
  const b = buttonAt(bx, by);
  if (isTouchDown && b) { b.pressed = true; g.downOnButton = b.id; return; }
  if (isAct && b) {
    if (!p.touch || g.downOnButton === b.id) { audio.play('click', { vol: 0.5 }); b.action(); }
    g.downOnButton = null;
    return;
  }
  if (p.kind === 'release') {
    if (p.touch && g.downOnButton) { g.downOnButton = null; return; }
  }
  if (g.screen === 'play') {
    if (isAct && !g.autopilot) {
      const r = tryPlace(g.world, p.x, p.y);
      if (r === 'denied') audio.play('deny', { vol: 0.5 });
    }
    return;
  }
  if (isAct) screenTap(p);
}

function screenTap(p) {
  if (g.screen === 'title') {
    if (g.screenT > 0.3 && !g.buttons.some(b => hit(b, p.x, p.y))) startFromTitle();
  } else if (g.screen === 'help') {
    nextHelp();
  }
}

function startFromTitle() {
  if (g.firstRun) save.set({ seenHelp: true });
  g.firstRun = false;
  startPlay();
}

function nextHelp() {
  g.helpPage++;
  if (g.helpPage >= 3) { g.helpPage = 0; go(g.helpFrom || 'title'); }
}

function onKey(k) {
  if (k === 'm' || k === 'M') {
    if (g.entry && !g.entry.saved && !g.entry.skipped && (g.screen === 'over' || g.screen === 'victory')) { typeLetter('M'); return; }
    const off = !(audio.musicMuted && audio.sfxMuted);
    audio.setMusicMuted(off); audio.setSfxMuted(off);
    return;
  }
  if (g.screen === 'play' && (k === 'Escape' || k === 'p' || k === 'P')) { pause(); return; }
  if (g.screen === 'pause' && (k === 'Escape' || k === 'p' || k === 'P' || k === 'Enter' || k === ' ')) { resume(); return; }
  if ((g.screen === 'over' || g.screen === 'victory') && g.entry && !g.entry.saved && !g.entry.skipped) {
    if (/^[a-zA-Z]$/.test(k)) typeLetter(k.toUpperCase());
    else if (k === 'Backspace') { g.entry.cursor = Math.max(0, g.entry.cursor - 1); }
    else if (k === 'ArrowUp' || k === 'ArrowDown') spinLetter(g.entry.cursor, k === 'ArrowUp' ? -1 : 1);
    else if (k === 'ArrowLeft') g.entry.cursor = Math.max(0, g.entry.cursor - 1);
    else if (k === 'ArrowRight') g.entry.cursor = Math.min(2, g.entry.cursor + 1);
    else if (k === 'Enter') saveEntry();
    else if (k === 'Escape') skipEntry();
    return;
  }
  if (k === 'Enter' || k === ' ') {
    if (g.screen === 'title') startFromTitle();
    else if (g.screen === 'help') nextHelp();
    else if ((g.screen === 'over' || g.screen === 'victory') && g.screenT > 1) startPlay();
    else if (g.screen === 'scores') go('title');
  }
  if (k === 'Escape' && (g.screen === 'scores' || g.screen === 'help')) go('title');
}

function typeLetter(L) {
  const e = g.entry;
  e.letters[e.cursor] = L;
  audio.play('click', { vol: 0.4, rate: 1.3 });
  if (e.cursor < 2) e.cursor++;
}
function spinLetter(i, d) {
  const e = g.entry;
  const c = e.letters[i].charCodeAt(0) - 65;
  e.letters[i] = String.fromCharCode(65 + ((c + d + 26) % 26));
  e.cursor = i;
  audio.play('click', { vol: 0.4, rate: 1.2 });
}
function saveEntry() {
  const e = g.entry;
  if (!e || e.saved) return;
  g.lastRun.initials = e.letters.join('');
  e.finalRank = save.addScore(g.lastRun);
  e.saved = true;
}
function skipEntry() { if (g.entry) g.entry.skipped = true; }

// ---------- loop ----------

const STEP = 1 / 60;
let acc = 0, last = performance.now();

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  acc += dt;
  requestAnimationFrame(frame);
  try {
    while (acc >= STEP) {
      tick(STEP);
      acc -= STEP;
    }
    draw();
  } catch (err) {
    acc = 0;
    console.error(err);
  }
}

function tick(dt) {
  g.t += dt;
  g.screenT += dt;
  handleInput(dt);
  R.updateEmbers(g.embers, dt, g.screen === 'play' && g.world ? g.world.camVel : 0);
  g.flash = Math.max(0, g.flash - dt);
  if (g.rotateNote && g.screen === 'play') pause();
  if (g.screen === 'play' || g.screen === 'over' || g.screen === 'victory') {
    const w = g.world;
    if (g.screen === 'play') {
      if (g.autopilot) autopilotTick(w, dt);
      updateWorld(w, dt);
      onEvents(w);
      updateMusicRate(w);
      if (w.golden && Math.random() < 0.5) burst(g.fx, w.pom.x + (Math.random() - 0.5) * 20, w.pom.y + (Math.random() - 0.5) * 20, { n: 1, color: '#ffe27a', speed: 30, life: 0.5, size: 3, kind: 'spark', gravity: 0 });
    }
    updateFx(g.fx, dt);
    g.fireFlare = Math.max(0, g.fireFlare - dt * 0.8);
    if (g.seedFly) { g.seedFly.t += dt * 1.6; if (g.seedFly.t >= 1) g.seedFly = null; }
  } else updateFx(g.fx, dt);
}

function updateMusicRate(w) {
  if (w.speed >= 2) audio.need('descent-fast');
  if (w.seeds >= 4) audio.need('hades');
  if (w.boss) audio.need('victory');
  if (w.mode === 'descent') {
    const fast = w.speed >= 2.5;
    const target = fast ? 1 + Math.min(0.08, (w.speed - 2.5) * 0.053) : 1 + Math.min(0.12, (w.speed - 1) * 0.05);
    audio.setRate(Math.round(target * 100) / 100);
    audio.music(fast ? 'descent-fast' : 'descent');
  } else if (w.boss && w.mode === 'boss') {
    audio.setRate(1 + Math.min(0.08, (5 - w.boss.hp) * 0.02));
  }
}

// ---------- drawing ----------

// Small links to synapticnoise.com and the GitHub repo, on the title screen only.
const titleLinks = [...document.querySelectorAll('.title-link')];
for (const a of titleLinks) {
  for (const ev of ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend']) a.addEventListener(ev, e => e.stopPropagation());
  a.addEventListener('keydown', e => { if (e.key === 'Enter') e.stopPropagation(); });
}
let linksShown = false;
function syncTitleLinks() {
  const show = g.screen === 'title' && !g.rotateNote;
  if (show === linksShown) return;
  linksShown = show;
  for (const a of titleLinks) { a.hidden = !show; if (!show && document.activeElement === a) a.blur(); }
}

function draw() {
  syncTitleLinks();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = view.scale * view.dpr;
  ctx.setTransform(s, 0, 0, s, view.ox * view.dpr, view.oy * view.dpr);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, C.W, C.dims.H); ctx.clip();
  g.buttons = [];
  switch (g.screen) {
    case 'loading': drawLoading(); break;
    case 'title': drawTitle(); break;
    case 'help': drawHelp(); break;
    case 'scores': drawScores(); break;
    case 'play': case 'pause': case 'over': case 'victory': drawGame(); break;
  }
  if (g.flash > 0) { ctx.fillStyle = `rgba(255,250,230,${g.flash})`; ctx.fillRect(0, 0, C.W, C.dims.H); }
  if (g.rotateNote) drawRotate();
  ctx.restore();
}

function drawLoading() {
  ctx.fillStyle = '#1b1433'; ctx.fillRect(0, 0, C.W, C.dims.H);
}

function drawRotate() {
  ctx.fillStyle = 'rgba(10,6,20,0.92)'; ctx.fillRect(0, 0, C.W, C.dims.H);
  R.text(ctx, 'Turn your phone upright', C.W / 2, C.dims.H / 2 - 20, { size: 34 });
  R.text(ctx, 'Pomegranate Panic plays in portrait', C.W / 2, C.dims.H / 2 + 26, { size: 22, color: '#d8c8f0' });
}

function muteButtons(y, x0 = C.W - 76 * 2 - 18) {
  g.buttons.push({ id: 'music', x: x0, y, w: 68, h: 68, icon: 'music', off: audio.musicMuted, style: 'small', action: () => audio.setMusicMuted(!audio.musicMuted) });
  g.buttons.push({ id: 'sound', x: x0 + 76, y, w: 68, h: 68, icon: 'sound', off: audio.sfxMuted, style: 'small', action: () => audio.setSfxMuted(!audio.sfxMuted) });
}

function drawButtons() {
  const hov = input.aim && !input.isTouch ? buttonAt(input.aim.x, input.aim.y) : null;
  for (const b of g.buttons) {
    if (g.downOnButton !== b.id) b.pressed = false;
    button(ctx, b, g.t, hov === b);
  }
}

function drawTitle() {
  const H = C.dims.H;
  if (img.title) {
    const ih = C.W * img.title.height / img.title.width;
    ctx.drawImage(img.title, 0, (H - ih) / 2, C.W, ih);
  } else R.drawBackground(ctx, img, g.t * 30, 0, g.t, g.embers);
  R.drawBackground.embersOnly?.();
  for (const e of g.embers) { ctx.globalAlpha = e.a; ctx.fillStyle = e.c; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  const grd = ctx.createLinearGradient(0, 0, 0, 420);
  grd.addColorStop(0, 'rgba(15,8,30,0.75)'); grd.addColorStop(1, 'rgba(15,8,30,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, C.W, 420);
  const bob = Math.sin(g.t * 2) * 4;
  const ty = 150;
  titleText(ctx, 'Pomegranate', C.W / 2, ty + bob, 54);
  titleText(ctx, 'Panic', C.W / 2, ty + 70 + bob, 70, '#ff6a4a');
  titleText(ctx, '2', C.W / 2 + 150, ty + 60 + bob, 64, '#fff2c0');
  R.text(ctx, 'SEEDS OF THE UNDERWORLD', C.W / 2, ty + 132, { size: 22, color: '#fff2c0', weight: 900 });
  // tumbling pom
  const pom = { x: C.W / 2, y: H * 0.47 + Math.sin(g.t * 1.6) * 16, r: C.POM_R * 2.2, rot: g.t * 1.8, squash: 0 };
  R.drawPom(ctx, img, pom, 0, false, g.t);
  const by = H - 330;
  const pulse = 0.7 + 0.3 * Math.sin(g.t * 4);
  g.buttons.push({ id: 'play', x: C.W / 2 - 150, y: by, w: 300, h: 84, label: 'PLAY', size: 40, action: startFromTitle });
  g.buttons.push({ id: 'scores', x: C.W / 2 - 150, y: by + 102, w: 300, h: 64, label: 'High Scores', style: 'ghost', action: () => go('scores') });
  g.buttons.push({ id: 'help', x: C.W / 2 - 150, y: by + 180, w: 300, h: 64, label: 'How to Play', style: 'ghost', action: () => { g.helpFrom = 'title'; g.helpPage = 0; go('help'); } });
  muteButtons(20);
  drawButtons();
  R.text(ctx, input.isTouch ? 'Tap anywhere to play' : 'Click or press Enter to play', C.W / 2, H - 34, { size: 20, color: '#fff2c0', alpha: pulse });
  const best = save.get().best;
  if (best > 0) R.text(ctx, `Best ${fmt(best)}`, 24, 54, { size: 22, align: 'left', color: '#ffd25a' });
}

function drawHelp() {
  const H = C.dims.H;
  R.drawBackground(ctx, img, g.t * 20, 0, g.t, g.embers);
  panel(ctx, 30, 110, C.W - 60, H - 260);
  const page = g.helpPage;
  const cx = C.W / 2;
  const titles = ['Catch the pomegranate', 'Bounce, bump, combo', 'Six seeds wake Hades'];
  titleText(ctx, titles[page], cx, 180, 30);
  const lines = [
    [input.isTouch ? 'Tap below the pomegranate' : 'Click below the pomegranate', 'to drop the NEXT marble ramp.', 'Keep it out of the fire!', '', 'Ramps have a tiny cooldown:', 'tap again and it waits its turn.'],
    ['Let it fall far, then catch it:', 'big drops BOUNCE for points.', 'Chain bounces and bumpers', 'for combos up to 10x.', '', 'Hit the gold jackpot 5 times!'],
    ['Steer into the glowing seeds.', 'Each one is worth more and', 'speeds things up.', 'Collect all six and Hades rises:', 'bounce on the MIDDLE of his face', 'five times to free Persephone.'],
  ][page];
  // little illustration
  const iy = 300;
  if (page === 0) {
    R.drawRamp(ctx, img, makeRamp(cx, iy + 70, 20, 162), 0);
    R.drawPom(ctx, img, { x: cx - 50, y: iy + 10 + Math.sin(g.t * 3) * 6, r: C.POM_R, rot: g.t * 3, squash: 0 }, 0, false, g.t);
  } else if (page === 1) {
    R.drawBumper(ctx, img, { kind: 'medium', x: cx - 90, y: iy + 40, r: 40, recoil: 0, light: 0, pulse: g.t * 3 }, 0, g.t);
    R.drawBumper(ctx, img, { kind: 'jackpot', jackpot: true, hits: 5, x: cx + 90, y: iy + 40, r: 56, recoil: 0, light: 0, pulse: g.t * 3 }, 0, g.t);
  } else {
    seedPips(ctx, img, cx - 75, iy - 60, Math.floor(g.t * 2) % 7, 30, 30);
    if (img['hades-1']) { const hw = 230, hh = hw * img['hades-1'].height / img['hades-1'].width; ctx.drawImage(img['hades-1'], cx - hw / 2, iy - 30, hw, hh);
      const a = 0.35 + 0.25 * Math.sin(g.t * 5);
      ctx.fillStyle = `rgba(255,230,120,${a})`; R.roundRect(ctx, cx - 30, iy - 26, 60, 116, 20); ctx.fill(); }
  }
  lines.forEach((l, i) => R.text(ctx, l, cx, 470 + i * 40, { size: 25, color: '#fff6d8', weight: 700 }));
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === page ? '#ffd25a' : 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(cx - 30 + i * 30, H - 190, 8, 0, Math.PI * 2); ctx.fill();
  }
  g.buttons.push({ id: 'next', x: cx - 130, y: H - 130, w: 260, h: 76, label: page < 2 ? 'Next' : 'Got it!', action: nextHelp });
  drawButtons();
}

function drawScores() {
  const H = C.dims.H;
  R.drawBackground(ctx, img, g.t * 20, 0, g.t, g.embers);
  panel(ctx, 24, 100, C.W - 48, 640);
  titleText(ctx, 'Hall of Heroes', C.W / 2, 170, 38);
  drawBoard(190, -1);
  R.text(ctx, `Reach ${fmt(BOARD_THRESHOLD)} to make the board.`, C.W / 2, 690, { size: 20, color: '#d8c8f0', weight: 700 });
  g.buttons.push({ id: 'back', x: C.W / 2 - 130, y: H - 150, w: 260, h: 76, label: 'Back', action: () => go('title') });
  drawButtons();
}

function drawBoard(y0, highlight) {
  const list = save.get().scores;
  R.text(ctx, 'Beat Hades first, then most seeds, then score', C.W / 2, y0 + 30, { size: 17, color: '#bfaee0', weight: 700 });
  for (let i = 0; i < 5; i++) {
    const e = list[i];
    const y = y0 + 90 + i * 84;
    if (i === highlight) { ctx.fillStyle = 'rgba(255,210,90,0.18)'; R.roundRect(ctx, 44, y - 36, C.W - 88, 72, 14); ctx.fill(); }
    R.text(ctx, `${i + 1}`, 70, y, { size: 30, color: '#ffd25a', font: R.FONT_TITLE });
    if (!e) { R.text(ctx, '— — —', C.W / 2, y, { size: 24, color: 'rgba(255,255,255,0.35)' }); continue; }
    R.text(ctx, e.initials, 110, y - 10, { size: 32, align: 'left', weight: 900 });
    R.text(ctx, fmt(e.score), C.W - 64, y - 10, { size: 30, align: 'right', color: '#fff2c0', weight: 900 });
    seedPips(ctx, img, 122, y + 22, e.seeds, 18, 20);
    R.text(ctx, `${e.seeds}/6`, 244, y + 22, { size: 15, align: 'left', color: '#d8c8f0', weight: 800 });
    if (e.beatHades) {
      if (img.laurel) ctx.drawImage(img.laurel, 284, y + 4, 36, 36);
      else R.text(ctx, '♛', 302, y + 22, { size: 24, color: '#ffd25a' });
      R.text(ctx, 'Hades beaten', 324, y + 22, { size: 16, align: 'left', color: '#ffd25a', weight: 800 });
    }
  }
}

function drawGame() {
  const w = g.world;
  const H = C.dims.H;
  const shake = w.shake > 0 ? Math.min(14, w.shake * 26) : 0;
  ctx.save();
  if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  const depth = Math.min(1, w.t / 150);
  R.drawBackground(ctx, img, w.cameraY, depth, g.t, g.embers);
  if (w.boss) drawBoss(ctx, img, w, g.t, 'back');
  for (const b of w.bumpers) R.drawBumper(ctx, img, b, w.cameraY, g.t);
  if (w.seed_) R.drawSeed(ctx, img, w.seed_, w.cameraY, g.t);
  for (const r of w.ramps) R.drawRamp(ctx, img, r, w.cameraY);
  // ghost ramp
  const gh = g.screen === 'play' && !g.autopilot ? input.ghost() : null;
  if (gh && !buttonAt(gh.x, gh.y)) {
    const gy = clampAim(gh.y);
    const ghost = makeRamp(gh.x, gy, w.next.angle, w.next.length);
    ghost.ghost = true; ghost.blocked = w.cooldown > 0;
    R.drawRamp(ctx, img, ghost, 0);
  }
  if (g.hint > 0 && g.screen === 'play') drawHint(w);
  if (input.isTouch && g.screen === 'play' && !w.dying && w.ready <= 0) drawNextGlyph(w);
  if (w.boss) drawBoss(ctx, img, w, g.t, 'mid');
  if (!(w.dying && w.dieT > 0.35)) R.drawPom(ctx, img, w.pom, w.cameraY, w.golden, g.t, w.boss && w.boss.bubble ? 1 : 1);
  if (w.boss) drawBoss(ctx, img, w, g.t, 'front');
  R.drawParticles(ctx, g.fx, w.cameraY, img);
  R.drawFire(ctx, g.fire, 1 / 60, g.fireFlare, w.boss ? w.boss.fireSwell || 0 : 0);
  R.drawTexts(ctx, g.fx, w.cameraY);
  if (w.boss && w.boss.phase === 'defeat') {
    // light breaks from above as he crumbles
    const k = Math.min(1, w.boss.defeatT / 3);
    const lg = ctx.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, `rgba(255,248,215,${0.85 * k})`); lg.addColorStop(0.6, `rgba(255,230,160,${0.35 * k})`); lg.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, C.W, H);
  }
  ctx.restore();
  drawHud(w);
  if (g.screen === 'pause') drawPause();
  if (g.screen === 'over') drawOver();
  if (g.screen === 'victory') drawVictory();
}

function drawNextGlyph(w) {
  const x = Math.max(60, Math.min(C.W - 60, w.pom.x + (w.pom.x < C.W / 2 ? 62 : -62)));
  const y = w.pom.y - w.cameraY - 44;
  const rad = w.next.angle * Math.PI / 180, L = w.next.length * 0.28;
  const dx = Math.cos(rad) * L / 2, dy = Math.sin(rad) * L / 2;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,240,200,0.35)'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
  const k = 1 - w.cooldown / Math.max(0.15, C.COOLDOWN / Math.sqrt(w.speed));
  ctx.strokeStyle = w.cooldown > 0 ? 'rgba(170,170,190,0.7)' : 'rgba(255,210,90,0.85)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x - dx + 2 * dx * Math.min(1, k), y - dy + 2 * dy * Math.min(1, k)); ctx.stroke();
  ctx.restore();
}

function drawHint(w) {
  const x = w.pom.x + 70, y = w.pom.y - w.cameraY + 150;
  const a = 0.5 + 0.5 * Math.sin(g.t * 5);
  ctx.save(); ctx.globalAlpha = a;
  const ghost = makeRamp(x, y, w.next.angle, w.next.length); ghost.ghost = true;
  R.drawRamp(ctx, img, ghost, 0);
  ctx.restore();
  R.text(ctx, input.isTouch ? 'Tap below the pom!' : 'Click below the pom!', C.W / 2, y + 60, { size: 30, color: '#ffd25a' });
}

function drawHud(w) {
  const H = C.dims.H - (g.safeBottom || 0);
  ctx.save();
  ctx.translate(0, g.safeTop || 0);
  R.text(ctx, fmt(w.score), 22, 46, { size: 40, align: 'left', weight: 900 });
  R.text(ctx, `×${w.speed.toFixed(1)} speed`, 24, 84, { size: 19, align: 'left', color: '#ffd9a0', weight: 800 });
  // seed sockets
  const sx = C.W / 2 - 75, sy = 118;
  ctx.fillStyle = 'rgba(20,10,35,0.55)';
  R.roundRect(ctx, sx - 22, sy - 20, 194, 40, 20); ctx.fill();
  seedPips(ctx, img, sx, sy, w.seeds - (g.seedFly ? 1 : 0), 30, 30);
  if (g.seedFly) {
    const k = g.seedFly.t, e = k * k * (3 - 2 * k);
    const tx = sx + (g.seedFly.n - 1) * 30, ty = sy;
    const fx0 = g.seedFly.x, fy0 = g.seedFly.y - w.cameraY;
    R.drawSeedIcon(ctx, img, fx0 + (tx - fx0) * e, fy0 + (ty - fy0) * e - Math.sin(k * Math.PI) * 80, 30 - 6 * e, k * 6);
  }
  if (w.boss) drawBossHud(ctx, img, w, g.t);
  if (w.combo >= 2) R.text(ctx, `${w.combo}x`, 24, 120, { size: 26, align: 'left', color: '#ffd25a', weight: 900 });
  // buttons (top right)
  if (g.screen === 'play') g.buttons.push({ id: 'pause', x: C.W - 84, y: 16 + (g.safeTop || 0), w: 68, h: 68, icon: 'pause', style: 'small', action: pause });
  // NEXT card (this block is drawn shifted down by safeTop, so pull it back up)
  const cw = 132, ch = 98, cx = C.W - cw - 14, cy = H - ch - 16 - (g.safeTop || 0);
  ctx.save();
  if (w.boss) ctx.globalAlpha = 0.5; // the pom can be down here in the arena
  ctx.fillStyle = 'rgba(20,10,35,0.7)';
  R.roundRect(ctx, cx, cy, cw, ch, 16); ctx.fill();
  ctx.strokeStyle = '#d9a640'; ctx.lineWidth = 3; R.roundRect(ctx, cx + 1.5, cy + 1.5, cw - 3, ch - 3, 15); ctx.stroke();
  R.text(ctx, 'NEXT', cx + cw / 2, cy + 18, { size: 17, color: '#ffd25a', weight: 900 });
  const pr = makeRamp(cx + cw / 2, cy + 60, w.next.angle, w.next.length * 0.5);
  R.drawRamp(ctx, img, pr, 0);
  if (w.cooldown > 0) {
    const k = Math.min(1, w.cooldown / Math.max(0.15, C.COOLDOWN / Math.sqrt(w.speed)));
    ctx.save();
    ctx.fillStyle = 'rgba(10,5,20,0.55)';
    ctx.beginPath(); ctx.moveTo(cx + cw / 2, cy + ch / 2 + 8);
    ctx.arc(cx + cw / 2, cy + ch / 2 + 8, 80, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.closePath();
    ctx.save(); R.roundRect(ctx, cx, cy, cw, ch, 16); ctx.clip(); ctx.fill(); ctx.restore();
    ctx.restore();
  }
  ctx.restore();
  // toasts
  if (g.fx.toasts.length) {
    const tt = g.fx.toasts[0];
    const a = Math.min(1, tt.life * 2, (tt.max - tt.life) * 4);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,10,35,0.8)';
    R.roundRect(ctx, 26, 160, C.W - 52, 54, 16); ctx.fill();
    ctx.restore();
    R.text(ctx, tt.text, C.W / 2, 188, { size: 20, alpha: a, weight: 800 });
  }
  if (w.ready > 0 && g.screen === 'play') R.text(ctx, 'Get ready…', C.W / 2, H * 0.62, { size: 40, color: '#fff2c0', alpha: Math.min(1, w.ready * 2) });
  ctx.restore();
  if (g.screen === 'play') drawButtons();
}

function drawPause() {
  const H = C.dims.H;
  ctx.fillStyle = 'rgba(10,6,20,0.6)'; ctx.fillRect(0, 0, C.W, H);
  panel(ctx, 60, H / 2 - 260, C.W - 120, 500);
  titleText(ctx, 'Paused', C.W / 2, H / 2 - 190, 44);
  g.buttons.push({ id: 'resume', x: C.W / 2 - 140, y: H / 2 - 130, w: 280, h: 80, label: 'Resume', action: resume });
  g.buttons.push({ id: 'restart', x: C.W / 2 - 140, y: H / 2 - 30, w: 280, h: 64, label: 'Restart', style: 'ghost', action: () => { audio.duck(false); startPlay(); } });
  g.buttons.push({ id: 'quit', x: C.W / 2 - 140, y: H / 2 + 50, w: 280, h: 64, label: 'Quit to title', style: 'ghost', action: () => { audio.duck(false); go('title'); } });
  muteButtons(H / 2 + 140, C.W / 2 - 72);
  drawButtons();
}

function drawEntry(y) {
  const e = g.entry;
  if (!e) {
    if (g.lastRun.score < BOARD_THRESHOLD) R.text(ctx, `Reach ${fmt(BOARD_THRESHOLD)} to make the board`, C.W / 2, y + 20, { size: 20, color: '#d8c8f0', weight: 700 });
    return y + 40;
  }
  if (e.saved) {
    R.text(ctx, `Saved! You're #${e.finalRank + 1} in the Hall of Heroes`, C.W / 2, y + 20, { size: 22, color: '#ffd25a' });
    return y + 40;
  }
  if (e.skipped) { R.text(ctx, 'Not saved', C.W / 2, y + 20, { size: 20, color: '#d8c8f0' }); return y + 40; }
  R.text(ctx, `New high score: #${e.rank + 1}! Save it?`, C.W / 2, y + 10, { size: 26, color: '#ffd25a' });
  const bx = C.W / 2 - 150;
  for (let i = 0; i < 3; i++) {
    const x = bx + i * 100 + 50;
    ctx.fillStyle = i === e.cursor ? 'rgba(255,210,90,0.25)' : 'rgba(255,255,255,0.08)';
    R.roundRect(ctx, x - 38, y + 82, 76, 84, 12); ctx.fill();
    R.text(ctx, e.letters[i], x, y + 126, { size: 56, weight: 900 });
    g.buttons.push({ id: 'up' + i, x: x - 38, y: y + 34, w: 76, h: 46, icon: 'up', style: 'small', action: () => spinLetter(i, -1) });
    g.buttons.push({ id: 'dn' + i, x: x - 38, y: y + 168, w: 76, h: 46, icon: 'down', style: 'small', action: () => spinLetter(i, 1) });
  }
  g.buttons.push({ id: 'save', x: C.W / 2 - 200, y: y + 230, w: 190, h: 70, label: 'Save', action: saveEntry });
  g.buttons.push({ id: 'skip', x: C.W / 2 + 10, y: y + 230, w: 190, h: 70, label: 'Skip', style: 'ghost', action: skipEntry });
  return y + 310;
}

function endButtons(y) {
  const busy = g.entry && !g.entry.saved && !g.entry.skipped;
  if (busy) return;
  g.buttons.push({ id: 'again', x: C.W / 2 - 150, y, w: 300, h: 80, label: 'Play again', action: startPlay });
  g.buttons.push({ id: 'totitle', x: C.W / 2 - 150, y: y + 96, w: 300, h: 60, label: 'Title', style: 'ghost', action: () => go('title') });
}

function drawOver() {
  const H = C.dims.H;
  const a = Math.min(1, g.screenT * 1.5);
  ctx.fillStyle = `rgba(30,6,14,${0.6 * a})`; ctx.fillRect(0, 0, C.W, H);
  ctx.save(); ctx.globalAlpha = a;
  panel(ctx, 30, 150, C.W - 60, H - 280);
  R.text(ctx, 'INTO THE FIRE!', C.W / 2, 220, { size: 42, weight: 900, color: '#ff7a4a', stroke: '#2a0f1e' });
  R.drawPom(ctx, img, { x: C.W / 2, y: 300, r: C.POM_R * 1.4, rot: g.t, squash: 0 }, 0, g.world.golden, g.t);
  R.text(ctx, fmt(g.lastRun.score), C.W / 2, 390, { size: 54, weight: 900 });
  if (g.newBest) R.text(ctx, 'New personal best!', C.W / 2, 432, { size: 22, color: '#ffd25a' });
  else R.text(ctx, `Best ${fmt(save.get().best)}`, C.W / 2, 432, { size: 20, color: '#d8c8f0' });
  seedPips(ctx, img, C.W / 2 - 75, 474, g.lastRun.seeds, 26, 30);
  const y = drawEntry(500);
  endButtons(Math.max(y + 20, 640));
  ctx.restore();
  if (g.screenT > 0.6) drawButtons(); else g.buttons = [];
}

function drawVictory() {
  const H = C.dims.H;
  const a = Math.min(1, g.screenT * 1.2);
  ctx.save(); ctx.globalAlpha = a;
  if (img.victory) { const ih = C.W * img.victory.height / img.victory.width; ctx.drawImage(img.victory, 0, (H - ih) / 2, C.W, ih); }
  else { const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffe7a8'); gr.addColorStop(0.5, '#9fd88a'); gr.addColorStop(1, '#3f8a4a'); ctx.fillStyle = gr; ctx.fillRect(0, 0, C.W, H); }
  // flowers bloom up the screen
  for (let i = 0; i < 14; i++) {
    const grow = Math.min(1, Math.max(0, g.screenT * 1.2 - i * 0.08));
    if (!grow || !img.flower) continue;
    const fx = 30 + ((i * 137) % (C.W - 60)), fy = 470 - ((i * 211) % 300) * (Math.abs(fx - C.W / 2) > 120 ? 1 : 0.2);
    const sz = (26 + (i % 3) * 10) * grow * (1 + 0.05 * Math.sin(g.t * 2 + i));
    ctx.drawImage(img.flower, fx - sz / 2, fy - sz / 2, sz, sz);
  }
  // Persephone
  const f = Math.floor(g.t * 6) % 4;
  const pim = img['persephone-' + f] || img['persephone-0'];
  const py = 150 + Math.sin(g.t * 2) * 6;
  if (pim) { const ph = 300, pw = ph * pim.width / pim.height; ctx.drawImage(pim, C.W / 2 - pw / 2, py, pw, ph); }
  titleText(ctx, 'Persephone is free!', C.W / 2, 90, 34, '#fff2c0');
  ctx.restore();
  ctx.save(); ctx.globalAlpha = Math.min(1, Math.max(0, (g.screenT - 0.6) * 2));
  panel(ctx, 30, 470, C.W - 60, H - 500);
  R.text(ctx, 'Hades is beaten', C.W / 2, 510, { size: 24, color: '#ffd25a' });
  R.text(ctx, fmt(g.lastRun.score), C.W / 2, 560, { size: 54, weight: 900 });
  const st = g.world.stats;
  R.text(ctx, `6 seeds · ${st.hadesHits} bonks · +40,000 for Persephone`, C.W / 2, 604, { size: 19, color: '#d8c8f0', weight: 800 });
  const y = drawEntry(630);
  endButtons(Math.max(y + 10, 680));
  ctx.restore();
  if (g.screenT > 1.2) drawButtons(); else g.buttons = [];
}

// ---------- pause on hide ----------

document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); audio.setHidden(document.hidden); });
window.addEventListener('blur', () => pause());

// ---------- debug hook (play-testing) ----------

window.__game = {
  state: () => {
    const w = g.world;
    return {
      screen: g.screen, H: C.dims.H,
      score: w ? w.score : 0, t: w ? +w.t.toFixed(2) : 0, speed: w ? +w.speed.toFixed(2) : 1, seeds: w ? w.seeds : 0,
      golden: w ? w.golden : false, mode: w ? w.mode : null, combo: w ? w.combo : 0,
      boss: w && w.boss ? { stage: w.boss.stage, hp: w.boss.hp, phase: w.boss.phase, blessing: w.boss.blessing, gaps: w.boss.gaps } : null,
      pom: w ? { x: Math.round(w.pom.x), y: Math.round(w.pom.y - w.cameraY), vx: Math.round(w.pom.vx), vy: Math.round(w.pom.vy), onRamp: !!w.pom.onRamp } : null,
      deathCause: w ? w.deathCause || null : null,
      ramps: w ? w.ramps.length : 0, cooldown: w ? +w.cooldown.toFixed(2) : 0, buffered: w ? !!w.buffered : false,
      seedOnScreen: w && w.seed_ ? { x: Math.round(w.seed_.x), y: Math.round(w.seed_.y - w.cameraY) } : null,
      gameOver: g.screen === 'over', won: g.screen === 'victory', entry: g.entry, stats: w ? w.stats : null,
    };
  },
  buttons: () => g.buttons.map(b => ({ id: b.id, x: b.x + b.w / 2, y: b.y + b.h / 2, cssX: view.ox + (b.x + b.w / 2) * view.scale, cssY: view.oy + (b.y + b.h / 2) * view.scale })),
  toCss: (x, y) => ({ x: view.ox + x * view.scale, y: view.oy + y * view.scale }),
  newRun: seed => { newRun(seed); return seed; },
  giveSeeds: n => { const w = g.world; w.seeds = Math.min(5, n); },
  startBoss: () => { const w = g.world; w.seeds = 6; startBossIntro(w); },
  setTime: t => { g.world.t = t; },
  setAutopilot: on => { g.autopilot = !!on; return g.autopilot; },
  fastForward: secs => {
    const was = g.autopilot; g.autopilot = true; audio.silent = true;
    for (let i = 0; i < secs * 60 && g.screen === 'play'; i++) tick(STEP);
    g.autopilot = was; audio.silent = false;
    return window.__game.state();
  },
  step: n => { audio.silent = true; for (let i = 0; i < n && g.screen === 'play'; i++) tick(STEP); audio.silent = false; return window.__game.state(); },
  audioState: () => audio.state(),
  levels: () => 1,
};

// ---------- boot ----------

async function boot() {
  const params = new URLSearchParams(location.search);
  if (params.has('seed')) g.seedParam = Number(params.get('seed')) >>> 0;
  resize();
  input.onFirstInput = () => audio.unlock();
  const fontsReady = document.fonts ? Promise.all([
    document.fonts.load(`900 40px ${R.FONT_TITLE}`), document.fonts.load(`800 20px ${R.FONT}`),
  ]).catch(() => {}) : Promise.resolve();
  [img] = await Promise.all([R.loadImages(), fontsReady]);
  g.embers = R.makeEmbers();
  g.fire = R.makeFire();
  document.getElementById('loading').remove();
  go('title');
  requestAnimationFrame(t => { last = t; frame(t); });
}
boot();
