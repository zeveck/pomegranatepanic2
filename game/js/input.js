// Turns mouse, touch and keys into game actions, in logical (540x960) units.
import { W, dims } from './config.js';

const HOLD_MS = 280, TAP_MOVE = 12, LIFT = 70, LIFT_EASE = 0.1;

export function createInput(canvas, view) {
  const inp = {
    aim: null,        // { x, y } where the ghost ramp is, or null
    aimLift: 0,       // 0..1 how far the touch ghost has lifted above the finger
    touchActive: false,
    isTouch: matchMedia('(pointer: coarse)').matches,
    presses: [],      // queued { kind: 'place'|'tap', x, y }
    keys: [],         // queued key names
    pointers: new Map(),
    onFirstInput: null,
  };

  const toLogical = e => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - view.ox) / view.scale,
      y: (e.clientY - r.top - view.oy) / view.scale,
    };
  };
  const first = () => { if (inp.onFirstInput) inp.onFirstInput(); };
  // While the bug report form is open, the player is typing: the game ignores
  // every key and touch (and doesn't preventDefault them either).
  const report = document.getElementById('report');
  const reportOpen = e => !!report && (e.composedPath?.().includes(report) || document.activeElement === report);
  inp.reportOpen = () => !!report && document.activeElement === report;

  canvas.addEventListener('pointerdown', e => {
    if (reportOpen(e)) return;
    e.preventDefault();
    first();
    const p = toLogical(e);
    const touch = e.pointerType !== 'mouse';
    if (touch) inp.isTouch = true;
    if (touch && inp.primary != null && inp.pointers.has(inp.primary)) return; // only the first finger aims
    if (touch) inp.primary = e.pointerId;
    inp.pointers.set(e.pointerId, { start: performance.now(), sx: p.x, sy: p.y, x: p.x, y: p.y, touch, moved: 0 });
    inp.presses.push({ kind: 'down', x: p.x, y: p.y, touch, id: e.pointerId });
    if (!touch) inp.aim = { x: p.x, y: p.y };
    else { inp.touchActive = true; inp.aimLift = 0; inp.aim = { x: p.x, y: p.y }; }
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  });

  canvas.addEventListener('pointermove', e => {
    if (reportOpen(e)) return;
    const p = toLogical(e);
    const ptr = inp.pointers.get(e.pointerId);
    if (e.pointerType === 'mouse') { inp.aim = { x: p.x, y: p.y }; inp.isTouch = false; }
    if (!ptr) return;
    ptr.moved = Math.max(ptr.moved, Math.hypot(p.x - ptr.sx, p.y - ptr.sy));
    ptr.x = p.x; ptr.y = p.y;
    if (ptr.touch) inp.aim = { x: p.x, y: p.y };
  });

  const up = (e, cancelled) => {
    if (reportOpen(e) && !inp.pointers.has(e.pointerId)) return;
    first(); // touch gestures only count on release on some browsers
    const ptr = inp.pointers.get(e.pointerId);
    if (!ptr) return;
    inp.pointers.delete(e.pointerId);
    const p = toLogical(e);
    if (ptr.touch) {
      // The ramp goes to the lifted ghost only once it had fully lifted; otherwise right at the finger.
      const quick = inp.aimLift < 1;
      const lift = quick ? 0 : LIFT;
      inp.presses.push({ kind: cancelled ? 'cancel' : 'release', x: p.x, y: p.y - lift, rawY: p.y, touch: true, quick, id: e.pointerId });
      inp.primary = null;
      if (inp.pointers.size === 0) { inp.touchActive = false; inp.aim = null; inp.aimLift = 0; }
    } else {
      inp.presses.push({ kind: 'release', x: p.x, y: p.y, touch: false, id: e.pointerId });
    }
  };
  canvas.addEventListener('pointerup', e => up(e, false));
  canvas.addEventListener('pointercancel', e => up(e, true));
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') inp.aim = null; });
  canvas.addEventListener('contextmenu', e => { if (!reportOpen(e)) e.preventDefault(); });
  window.addEventListener('touchend', first, { passive: true });
  window.addEventListener('click', first);

  const GAME_KEYS = ['Escape', 'p', 'P', 'm', 'M', 'Enter', ' ', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (reportOpen(e)) return;
    first();
    if (GAME_KEYS.includes(e.key) || /^[a-zA-Z]$/.test(e.key)) e.preventDefault();
    if (!e.repeat) inp.keys.push(e.key);
  });

  // Touch ghost lifts above the finger once it's clearly a hold, not a tap.
  inp.update = dt => {
    if (!inp.touchActive) return;
    let held = false;
    for (const ptr of inp.pointers.values()) {
      if (ptr.touch && (performance.now() - ptr.start > HOLD_MS || ptr.moved >= TAP_MOVE)) held = true;
    }
    if (held) inp.aimLift = Math.min(1, inp.aimLift + dt / LIFT_EASE);
  };
  // Where the ghost should be drawn (screen logical).
  inp.ghost = () => {
    if (!inp.aim) return null;
    const y = inp.touchActive ? inp.aim.y - inp.aimLift * LIFT : inp.aim.y;
    if (inp.aim.x < 0 || inp.aim.x > W || y < 0 || y > dims.H) return null;
    return { x: inp.aim.x, y };
  };
  inp.drain = () => { const p = inp.presses; inp.presses = []; const k = inp.keys; inp.keys = []; return { presses: p, keys: k }; };
  return inp;
}
