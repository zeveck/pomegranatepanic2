// Saved settings and the high score board, in localStorage.
const KEY = 'pomPanic2.save';
export const BOARD_SIZE = 5;
export const BOARD_THRESHOLD = 10000;

function fresh() {
  return { v: 1, scores: [], best: 0, muteMusic: false, muteSfx: false, seenHelp: false };
}

function clean(s) {
  const out = fresh();
  if (!s || typeof s !== 'object') return out;
  out.best = Number.isFinite(s.best) ? s.best : 0;
  out.muteMusic = !!s.muteMusic;
  out.muteSfx = !!s.muteSfx;
  out.seenHelp = !!s.seenHelp;
  if (Array.isArray(s.scores)) {
    out.scores = s.scores
      .filter(e => e && Number.isFinite(e.score))
      .map(e => ({
        initials: String(e.initials || '???').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, '-'),
        score: Math.floor(e.score),
        seeds: Math.max(0, Math.min(6, e.seeds | 0)),
        beatHades: !!e.beatHades,
        date: String(e.date || ''),
      }))
      .sort(compareEntries)
      .slice(0, BOARD_SIZE);
  }
  return out;
}

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? clean(JSON.parse(raw)) : fresh();
  } catch {
    return fresh();
  }
}

function write() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ }
}

// Beating Hades outranks not beating him; then more seeds; then a higher score.
export function compareEntries(a, b) {
  if (a.beatHades !== b.beatHades) return a.beatHades ? -1 : 1;
  if (a.seeds !== b.seeds) return b.seeds - a.seeds;
  return b.score - a.score;
}

export const save = {
  get: () => data,
  set(patch) { Object.assign(data, patch); write(); },
  // Where a run would land on the board (0-based), or -1 if it doesn't make it.
  boardRank(run) {
    if (run.score < BOARD_THRESHOLD) return -1;
    const list = [...data.scores, run].sort(compareEntries);
    const i = list.indexOf(run);
    return i < BOARD_SIZE ? i : -1;
  },
  addScore(run) {
    const entry = { ...run, date: new Date().toISOString().slice(0, 10) };
    data.scores = [...data.scores, entry].sort(compareEntries).slice(0, BOARD_SIZE);
    write();
    return data.scores.indexOf(entry);
  },
  noteBest(score) {
    if (score > data.best) { data.best = score; write(); return true; }
    return false;
  },
  reload() { data = load(); },
};
