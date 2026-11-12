import { state, save, setMode, onMode, markStarted, markDone, resetAll } from './state.js';
import { h, icon, feedback, hideFeedback } from './ui.js';
import s1 from './stations/s1.js';
import s2 from './stations/s2.js';
import s3 from './stations/s3.js';
import s4 from './stations/s4.js';
import s5 from './stations/s5.js';
import s6 from './stations/s6.js';
import s7 from './stations/s7.js';
import s8 from './stations/s8.js';
import s9 from './stations/s9.js';

const STATIONS = [s1, s2, s3, s4, s5, s6, s7, s8, s9];
const app = document.getElementById('app');
let cleanup = null;

// iOS: Doppeltipp- und Gesten-Zoom unterbinden (beim Zeichnen störend)
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

const LOGO = '<svg viewBox="0 0 40 40"><path d="M6 34L34 34L6 8Z"/><path d="M12 28h10L12 18.5Z"/><path d="M6 34v-3M11 34v-2M16 34v-3M21 34v-2M26 34v-3"/></svg>';
const stars = n => '★'.repeat(n) + '<span class="off">' + '★'.repeat(3 - n) + '</span>';

function route() {
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  hideFeedback();
  document.querySelectorAll('.done-ov,.numpad-ov').forEach(e => e.remove());
  app.innerHTML = '';
  const m = location.hash.match(/^#\/station\/(\d)/);
  if (m) return renderStation(+m[1]);
  if (location.hash === '#/urkunde') return renderCert();
  renderHome();
}
window.addEventListener('hashchange', route);

function modeToggle() {
  const wrap = h('div', { class: 'mode', role: 'group', 'aria-label': 'Zeichnen mit' }, h('span', {}, 'Zeichnen mit'));
  const b1 = h('button', { onclick: () => setMode('pen') }, 'Stift');
  const b2 = h('button', { onclick: () => setMode('finger') }, 'Finger');
  const upd = () => { b1.classList.toggle('on', state.mode === 'pen'); b2.classList.toggle('on', state.mode !== 'pen'); };
  upd(); const off = onMode(upd);
  wrap.append(b1, b2);
  return { el: wrap, off };
}

function renderHome() {
  const done = STATIONS.filter(s => state.progress[s.id]?.done).length;
  const mt = modeToggle();
  const modeInfo = h('span');
  const info = () => { modeInfo.textContent = state.mode === 'pen' ? 'Stift-Modus: Nur der Apple Pencil zeichnet, die Hand darf aufliegen.' : 'Finger-Modus: Finger und Stift zeichnen.'; };
  info();
  const offInfo = onMode(info);
  cleanup = () => { mt.off(); offInfo(); };
  const cards = STATIONS.map(s => {
    const p = state.progress[s.id] || {};
    return h('button', { class: 'card' + (p.done ? ' done' : p.started ? ' started' : ''), onclick: () => { location.hash = '#/station/' + s.id; } },
      h('div', { class: 'card-head' }, h('span', { class: 'num' }, String(s.id).padStart(2, '0')), h('span', { class: 'tag' }, p.started && !p.done ? 'angefangen' : s.tag)),
      h('div', { class: 'ico', html: `<svg viewBox="0 0 48 48">${s.icon}</svg>` }),
      h('h3', {}, s.title),
      h('div', { class: 'foot' }, h('span', {}, `ca. ${s.min} min`), p.done ? h('span', { class: 'stars', html: '★'.repeat(p.stars || 1) }) : ''),
      p.done ? h('span', { class: 'stamp' }, 'GEPRÜFT') : ''
    );
  });
  app.append(h('div', { class: 'home' },
    h('header', { class: 'top' },
      h('div', { class: 'brand' }, h('span', { class: 'logo', html: LOGO }), h('div', {}, h('h1', {}, 'Zeichenwerkstatt'), h('p', {}, 'Technisches Zeichnen · 9 Stationen · Reihenfolge frei wählbar'))),
      mt.el,
      h('button', { class: 'pass', title: 'Werkstatt-Ausweis', onclick: () => { location.hash = '#/urkunde'; } }, h('b', {}, String(done)), ` / 9 Stempel`)
    ),
    done === 9 ? h('div', { class: 'banner' }, h('b', {}, 'Alle Stationen geprüft!'), h('button', { class: 'btn acc', onclick: () => { location.hash = '#/urkunde'; } }, 'Urkunde ansehen')) : '',
    h('main', { class: 'grid9' }, cards),
    h('footer', { class: 'bottom' },
      modeInfo,
      h('button', { class: 'linkbtn', onclick: () => { if (confirm('Fortschritt auf diesem iPad wirklich löschen?')) { resetAll(); route(); } } }, 'Fortschritt zurücksetzen'))
  ));
}

function renderStation(id) {
  const s = STATIONS.find(x => x.id === id);
  if (!s) { location.hash = ''; return; }
  markStarted(id);
  const stepsEl = h('div', { class: 'steps' });
  const body = h('div', { class: 'st-body' });
  app.append(h('div', { class: 'station' },
    h('header', { class: 'bar' },
      h('button', { class: 'btn small flat', onclick: () => { location.hash = ''; }, html: icon('back') + '<span>Werkstatt</span>' }),
      h('div', { class: 'crumb' }, h('span', { class: 'num' }, String(id).padStart(2, '0')), h('span', { class: 't' }, s.title)),
      stepsEl),
    body));
  const ctx = {
    steps(n, i) {
      stepsEl.innerHTML = '';
      for (let k = 0; k < n; k++) stepsEl.append(h('i', { class: k < i ? 'on' : k === i ? 'now' : '' }));
    },
    feedback, hideFeedback,
    complete(st, text) {
      markDone(id, st);
      hideFeedback();
      const next = STATIONS.find(x => x.id > id && !state.progress[x.id]?.done) || STATIONS.find(x => !state.progress[x.id]?.done);
      const ov = h('div', { class: 'done-ov' }, h('div', { class: 'done-card' },
        h('div', { class: 'big-stamp' }, 'GEPRÜFT'),
        h('h2', {}, 'Station geschafft!'),
        h('div', { class: 'stars', html: stars(st) }),
        h('p', { html: text || '' }),
        h('div', { class: 'row center' },
          h('button', { class: 'btn', onclick: () => { ov.remove(); } }, 'Nochmal ansehen'),
          next ? h('button', { class: 'btn primary', onclick: () => { location.hash = '#/station/' + next.id; } }, `Weiter: ${next.title}`)
               : h('button', { class: 'btn acc', onclick: () => { location.hash = '#/urkunde'; } }, 'Zur Urkunde'),
          h('button', { class: 'btn flat', onclick: () => { location.hash = ''; } }, 'Zur Werkstatt'))
      ));
      document.body.append(ov);
    },
  };
  try { cleanup = s.render(body, ctx) || null; }
  catch (e) { console.error(e); body.append(h('p', {}, 'Hier ist leider etwas schiefgegangen. Bitte Seite neu laden.')); }
}

function renderCert() {
  const done = STATIONS.filter(s => state.progress[s.id]?.done).length;
  const name = h('input', { class: 'name', placeholder: 'Dein Name', value: state.name || '', oninput: e => { state.name = e.target.value; save(); } });
  app.append(h('div', { class: 'station' },
    h('header', { class: 'bar noprint' },
      h('button', { class: 'btn small flat', onclick: () => { location.hash = ''; }, html: icon('back') + '<span>Werkstatt</span>' }),
      h('div', { class: 'crumb' }, h('span', { class: 't' }, 'Werkstatt-Ausweis'))),
    h('div', { class: 'st-body', style: { overflow: 'auto' } }, h('div', { class: 'cert' },
      h('div', { class: 'kicker' }, 'Zeichenwerkstatt'),
      h('h2', {}, done === 9 ? 'Urkunde' : 'Werkstatt-Ausweis'),
      h('p', {}, done === 9 ? 'Hiermit wird bestätigt, dass' : 'Gesammelte Prüfstempel von'),
      name,
      h('p', {}, done === 9 ? 'alle 9 Stationen zum Technischen Zeichnen erfolgreich geschafft hat.' : `${done} von 9 Stationen sind schon geprüft.`),
      h('div', { class: 'stamps' }, STATIONS.map(s => h('div', { class: state.progress[s.id]?.done ? 'got' : '' }, `${s.id} · ${s.title}`))),
      done === 9 ? h('button', { class: 'btn noprint', onclick: () => print() }, 'Drucken') : h('button', { class: 'btn primary noprint', onclick: () => { location.hash = ''; } }, 'Weiter üben')
    ))));
}

route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
