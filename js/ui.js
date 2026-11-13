// Kleine Helfer für Oberfläche, Rückmeldung und Ziehen & Ablegen.

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const SVGNS = 'http://www.w3.org/2000/svg';
export function svg(markup, viewBox, cls = '') {
  const el = document.createElementNS(SVGNS, 'svg');
  el.setAttribute('viewBox', viewBox);
  if (cls) el.setAttribute('class', cls);
  el.innerHTML = markup;
  return el;
}

export function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export const ICON = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  pen: '<path d="M4 20l3.5-1 11-11a2.1 2.1 0 00-3-3l-11 11z"/><path d="M14 6l3 3"/>',
  ruler: '<path d="M3 15L15 3l6 6L9 21z"/><path d="M7 11l2 2M10 8l2 2M13 5l2 2"/>',
  eraser: '<path d="M8 20h12"/><path d="M4.5 14.5l9-9a2 2 0 012.8 0l3.2 3.2a2 2 0 010 2.8L13 18H8z"/><path d="M9 10l6 6"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  rotate: '<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v5h-5"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 013 0V12M11 11V4.5a1.5 1.5 0 013 0V12M14 11.5V6a1.5 1.5 0 013 0v8c0 4-2.5 7-6.5 7S5 18.5 4 16l-1.5-3.5a1.5 1.5 0 012.6-1.5L8 14"/>',
};
export function icon(name) { return `<svg viewBox="0 0 24 24">${ICON[name]}</svg>`; }

// ---------- Rückmeldung ----------
let fbEl = null, fbTimer = null;
// text/easy: normale und einfache Erklärung. Listeneinträge: 'Text' oder ['Text', 'einfacher Text'].
export function feedback({ kind = 'info', title = '', text = '', easy = '', list = null, actions = null, auto = 0 } = {}) {
  if (!fbEl) {
    fbEl = h('div', { class: 'fbk', role: 'status', 'aria-live': 'polite' });
    document.body.append(fbEl);
  }
  clearTimeout(fbTimer);
  fbEl.className = 'fbk ' + kind;
  fbEl.innerHTML = '';
  const items = (list || []).map(li => (Array.isArray(li) ? li : [li, '']));
  const hasEasy = !!easy || items.some(([, e]) => e);
  let simple = false;
  const body = h('div');
  const render = () => {
    body.innerHTML = '';
    if (simple) body.append(h('div', { class: 'easy-tag' }, 'Einfacher erklärt'));
    const t = simple && easy ? easy : text;
    if (t) body.append(h('div', { html: t }));
    if (items.length) body.append(h('ul', {}, items.map(([n, e]) => h('li', { html: simple && e ? e : n }))));
  };
  render();
  const easyBtn = hasEasy ? h('button', { class: 'btn small easy-btn', onclick: () => {
    simple = !simple; render();
    easyBtn.innerHTML = simple ? 'Normale Erklärung' : '<span aria-hidden="true">?</span> Einfacher erklärt';
  }, html: '<span aria-hidden="true">?</span> Einfacher erklärt' }) : null;
  const acts = (actions || []).map(a => h('button', { class: 'btn small ' + (a.cls || ''), onclick: () => a.onClick() }, a.label));
  fbEl.append(
    h('button', { class: 'x', 'aria-label': 'Schließen', onclick: () => hideFeedback() }, '×'),
    title ? h('b', { class: 't' }, title) : '',
    body,
    easyBtn || acts.length ? h('div', { class: 'acts' }, easyBtn, ...acts) : ''
  );
  requestAnimationFrame(() => fbEl.classList.add('show'));
  if (auto && !hasEasy) fbTimer = setTimeout(hideFeedback, auto);
}
export function hideFeedback() { if (fbEl) fbEl.classList.remove('show'); }

let toastTimer = null;
export function toast(text, ms = 3200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function shake(el) {
  if (!el) return;
  el.classList.remove('shake'); void el.getBoundingClientRect(); el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 450);
}

// ---------- Ziehen & Ablegen (Finger, Stift, Maus) ----------
// Elemente mit data-chip lassen sich auf Elemente mit data-target ziehen.
// Alternativ: Begriff antippen, dann Ziel antippen.
export function dnd(root, { onDrop }) {
  let selected = null;
  const targetAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el && el.closest ? el.closest('[data-target]') : null;
  };
  const clearOver = () => root.querySelectorAll('.over').forEach(e => e.classList.remove('over'));
  const select = chip => {
    if (selected) selected.classList.remove('sel');
    selected = chip && selected !== chip ? chip : null;
    if (selected) selected.classList.add('sel');
  };

  root.addEventListener('pointerdown', e => {
    const chip = e.target.closest('[data-chip]');
    if (!chip || chip.classList.contains('used')) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    let ghost = null, over = null;
    try { chip.setPointerCapture(e.pointerId); } catch (_) {}
    const move = ev => {
      if (!ghost && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 8) {
        ghost = chip.cloneNode(true);
        ghost.classList.add('ghost'); ghost.classList.remove('sel');
        ghost.style.width = chip.getBoundingClientRect().width + 'px';
        document.body.append(ghost);
        chip.classList.add('dragging');
        select(null);
      }
      if (ghost) {
        ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
        const t = targetAt(ev.clientX, ev.clientY);
        if (t !== over) { clearOver(); over = t; if (t) t.classList.add('over'); }
      }
    };
    const end = ev => {
      chip.removeEventListener('pointermove', move);
      chip.removeEventListener('pointerup', end);
      chip.removeEventListener('pointercancel', end);
      clearOver();
      if (ghost) {
        ghost.remove(); chip.classList.remove('dragging');
        const t = ev.type === 'pointerup' ? targetAt(ev.clientX, ev.clientY) : null;
        if (t) onDrop(chip.dataset.chip, t.dataset.target, chip, t);
      } else if (ev.type === 'pointerup') {
        select(chip);
      }
    };
    chip.addEventListener('pointermove', move);
    chip.addEventListener('pointerup', end);
    chip.addEventListener('pointercancel', end);
  });

  root.addEventListener('click', e => {
    if (!selected) return;
    const t = e.target.closest('[data-target]');
    if (t) { const c = selected; select(null); onDrop(c.dataset.chip, t.dataset.target, c, t); }
  });
  return { clear: () => select(null) };
}

// Zahlenfeld für die Maßzahl (große Tasten, gut mit Stift und Finger)
export function numpad(title, onDone) {
  let val = '';
  const disp = h('div', { class: 'disp' }, '');
  const ov = h('div', { class: 'numpad-ov' });
  const close = r => { ov.remove(); onDone(r); };
  const key = k => h('button', {
    class: k === 'OK' ? 'ok' : '',
    onclick: () => {
      if (k === '⌫') val = val.slice(0, -1);
      else if (k === 'OK') { if (val) close(parseInt(val, 10)); return; }
      else if (val.length < 3) val += k;
      disp.textContent = val;
    }
  }, k);
  ov.append(h('div', { class: 'numpad' },
    h('div', { class: 'row' }, h('b', { class: 'grow' }, title), h('button', { class: 'linkbtn', onclick: () => close(null) }, 'Abbrechen')),
    disp,
    h('div', { class: 'keys' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].map(key))
  ));
  ov.addEventListener('pointerdown', e => { if (e.target === ov) close(null); });
  document.body.append(ov);
}
