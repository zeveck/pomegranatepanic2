// Web Audio: effects, looping music with crossfades and tempo, mute toggles.
const SFX = [
  'place', 'deny', 'land', 'bounce', 'combo', 'bumper', 'jackpot-hit', 'jackpot-burst',
  'seed', 'golden', 'burn', 'hades-rise', 'hades-hit', 'hades-vanish', 'fireball',
  'crumble', 'hades-defeat', 'highscore', 'click', 'gameover', 'warning', 'quake',
  'knock', 'wall', 'fire-loop', 'critical', 'blessing',
];
// A few generated effects came out quiet; this evens them up.
const GAIN = { 'jackpot-hit': 2.6, combo: 2.4, deny: 2.6, bumper: 2.2, crumble: 2.2 };

// Music tracks: true = loops (over the silence-trimmed window), false = one-shot.
const MUSIC = { title: true, descent: true, 'descent-fast': true, hades: true, victory: false };

// Where the sound really starts and ends (skips encoder padding and silent tails).
function trimWindow(buf) {
  const d = buf.getChannelData(0), n = d.length, thr = 0.004;
  let a = 0, b = n - 1;
  while (a < n && Math.abs(d[a]) < thr) a++;
  while (b > a && Math.abs(d[b]) < thr) b--;
  return { start: Math.max(0, a - 32) / buf.sampleRate, end: Math.min(n, b + 32) / buf.sampleRate };
}

export function createAudio(save) {
  const a = {
    ctx: null, buffers: {}, loading: null,
    musicMuted: save.get().muteMusic, sfxMuted: save.get().muteSfx,
    current: null, rate: 1, ambience: null,
  };
  let master, musicBus, sfxBus;

  a.unlock = () => {
    if (!a.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      a.ctx = new AC();
      master = a.ctx.createGain(); master.connect(a.ctx.destination);
      musicBus = a.ctx.createGain(); musicBus.gain.value = a.musicMuted ? 0 : 0.55; musicBus.connect(master);
      sfxBus = a.ctx.createGain(); sfxBus.gain.value = a.sfxMuted ? 0 : 0.9; sfxBus.connect(master);
      a.loading = loadAll();
    }
    if (a.ctx.state !== 'running' && !a.hidden) a.ctx.resume().catch(() => {});
  };

  async function load(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) return null;
      return await a.ctx.decodeAudioData(await res.arrayBuffer());
    } catch { return null; }
  }
  const pending = {};
  // Load a music track on demand (decoded music is big, so only what's needed is kept).
  a.need = name => {
    if (!a.ctx || !name || a.buffers['m:' + name] || pending[name]) return pending[name];
    pending[name] = load(`assets/audio/music/${name}.mp3`).then(b => {
      delete pending[name];
      if (!b) return;
      a.buffers['m:' + name] = b; a.trims['m:' + name] = trimWindow(b);
      if (a.wantMusic === name && (!a.current || a.current.name !== name)) a.music(name, true);
    });
    return pending[name];
  };
  a.free = name => { if (!a.current || a.current.name !== name) delete a.buffers['m:' + name]; };
  a.trims = {};
  async function loadAll() {
    if (a.wantMusic) a.need(a.wantMusic);
    await Promise.all(SFX.map(n => load(`assets/audio/sfx/${n}.mp3`).then(b => {
      if (b) { a.buffers[n] = b; a.trims[n] = trimWindow(b); }
    })));
    if (a.wantAmbience) a.ambient(true);
    a.need('descent');
  }

  a.silent = false; // fastForward runs without sound
  a.play = (name, { vol = 1, rate = 1, vary = 0 } = {}) => {
    if (!a.ctx || a.sfxMuted || a.silent) return;
    const buf = a.buffers[name];
    if (!buf) return;
    const src = a.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * vary);
    const g = a.ctx.createGain(); g.gain.value = vol * (GAIN[name] || 1);
    src.connect(g); g.connect(sfxBus);
    const tr = a.trims[name];
    src.start(0, tr ? tr.start : 0);
  };

  // Crossfade to a music track (null = silence). Same track = no restart.
  a.music = (name, force = false) => {
    a.wantMusic = name;
    if (!a.ctx) return;
    if (!force && a.current && a.current.name === name) return;
    const now = a.ctx.currentTime;
    if (a.current) {
      const old = a.current;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + 0.8);
      old.src.stop(now + 0.85);
      a.current = null;
    }
    const buf = name && a.buffers['m:' + name];
    if (!buf) { if (name) a.need(name); return; }
    const src = a.ctx.createBufferSource();
    src.buffer = buf;
    const tr = a.trims['m:' + name] || { start: 0, end: buf.duration };
    if (MUSIC[name]) {
      src.loop = true;
      src.loopStart = tr.start;
      src.loopEnd = tr.end;
    }
    src.playbackRate.value = a.rate;
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(1, now + 0.6);
    src.connect(g); g.connect(musicBus);
    src.start(0, tr.start);
    a.current = { name, src, gain: g };
  };

  a.setRate = r => {
    a.rate = r;
    if (a.current && a.ctx) a.current.src.playbackRate.setTargetAtTime(r, a.ctx.currentTime, 0.3);
  };

  // Quiet crackling fire under the descent.
  a.ambient = (on, vol = 0.25) => {
    a.wantAmbience = on;
    if (!a.ctx) return;
    if (on && !a.ambience && a.buffers['fire-loop']) {
      const src = a.ctx.createBufferSource();
      src.buffer = a.buffers['fire-loop']; src.loop = true;
      const tr = a.trims['fire-loop']; if (tr) { src.loopStart = tr.start; src.loopEnd = tr.end; }
      const g = a.ctx.createGain(); g.gain.value = vol;
      src.connect(g); g.connect(sfxBus); src.start();
      a.ambience = { src, gain: g };
    } else if (!on && a.ambience) {
      a.ambience.src.stop(); a.ambience = null;
    }
    if (a.ambience) a.ambience.gain.gain.setTargetAtTime(vol, a.ctx.currentTime, 0.2);
  };

  a.setMusicMuted = m => {
    a.musicMuted = m; save.set({ muteMusic: m });
    if (musicBus) musicBus.gain.setTargetAtTime(m ? 0 : 0.55, a.ctx.currentTime, 0.05);
  };
  a.setSfxMuted = m => {
    a.sfxMuted = m; save.set({ muteSfx: m });
    if (sfxBus) sfxBus.gain.setTargetAtTime(m ? 0 : 0.9, a.ctx.currentTime, 0.05);
  };
  // Pause: duck everything.
  a.duck = on => {
    if (master && a.ctx) master.gain.setTargetAtTime(on ? 0.15 : 1, a.ctx.currentTime, 0.1);
  };
  // Page hidden: stop all sound; back: carry on.
  a.setHidden = h => {
    a.hidden = h;
    if (!a.ctx) return;
    if (h) a.ctx.suspend().catch(() => {}); else a.ctx.resume().catch(() => {});
  };
  a.state = () => ({
    context: a.ctx ? a.ctx.state : 'none', musicMuted: a.musicMuted, sfxMuted: a.sfxMuted,
    track: a.current ? a.current.name : null, rate: a.rate,
    loaded: Object.keys(a.buffers).length,
    music: Object.keys(a.buffers).filter(k => k.startsWith('m:')).map(k => k.slice(2)),
  });
  return a;
}
