// Fortschritt und Einstellungen – nur lokal auf diesem Gerät gespeichert.
const KEY = 'zeichenwerkstatt-v1';
const base = { mode: 'finger', progress: {}, name: '' };
let s = base;
try {
  const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (raw && typeof raw === 'object') s = { ...base, ...raw };
} catch (e) { /* privater Modus o. Ä. – dann eben ohne Speichern */ }

export const state = s;

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignorieren */ }
}

const listeners = new Set();
export function onMode(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function setMode(m) {
  if (state.mode === m) return;
  state.mode = m; save();
  listeners.forEach(fn => fn(m));
}

export function markStarted(id) {
  const p = state.progress[id] || (state.progress[id] = {});
  if (!p.started) { p.started = true; save(); }
}
export function markDone(id, stars) {
  const p = state.progress[id] || (state.progress[id] = {});
  p.started = true; p.done = true;
  p.stars = Math.max(p.stars || 0, stars);
  save();
}
export function resetAll() {
  state.progress = {}; state.name = ''; save();
}
