// Zeichenfläche für Apple Pencil, Finger und Maus.
// Striche werden als Vektoren gespeichert, damit die App sie prüfen kann.
import { state, setMode } from './state.js';
import { h, icon, toast, SVGNS } from './ui.js';

export const STYLES = {
  wide:    { label: 'breit',       w: 3.2 },
  thin:    { label: 'schmal',      w: 1.3 },
  dash:    { label: 'Strich',      w: 1.8, dash: [8, 5] },
  dashdot: { label: 'Strich-Punkt', w: 1.3, dash: [16, 4, 2, 4] },
};

export class Pad {
  constructor(host, opts = {}) {
    this.o = Object.assign({
      w: 600, h: 400, cell: 0, snap: false, gridColor: 'rgba(35,38,43,.13)', gridMajor: 0,
      bg: '', tool: 'line', style: 'wide', pressure: true, onChange: null,
    }, opts);
    this.tool = this.o.tool; this.style = this.o.style;
    this.strokes = []; this.history = [];
    this.cur = null; this.preview = null;
    const { w, h: H } = this.o;

    host.classList.add('pad');
    this.host = host;
    this.stage = h('div', { class: 'pad-stage' });
    this.bg = document.createElementNS(SVGNS, 'svg');
    this.bg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    this.bg.innerHTML = this.gridMarkup() + (this.o.bg || '');
    this.canvas = h('canvas');
    this.ov = document.createElementNS(SVGNS, 'svg');
    this.ov.setAttribute('viewBox', `0 0 ${w} ${H}`);
    this.ov.setAttribute('class', 'pad-ov');
    this.stage.append(this.bg, this.canvas, this.ov);
    host.append(this.stage);
    this.ctx = this.canvas.getContext('2d');

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    requestAnimationFrame(() => this.resize());
    this.bind();
  }

  gridMarkup() {
    const { w, h: H, cell, gridColor, gridMajor } = this.o;
    if (!cell) return '';
    let d = '', dm = '';
    for (let x = 0, i = 0; x <= w + 0.1; x += cell, i++) (gridMajor && i % gridMajor === 0 ? (dm += `M${x} 0V${H}`) : (d += `M${x} 0V${H}`));
    for (let y = 0, i = 0; y <= H + 0.1; y += cell, i++) (gridMajor && i % gridMajor === 0 ? (dm += `M0 ${y}H${w}`) : (d += `M0 ${y}H${w}`));
    return `<path d="${d}" stroke="${gridColor}" stroke-width="1" fill="none"/>` +
      (dm ? `<path d="${dm}" stroke="rgba(35,38,43,.22)" stroke-width="1" fill="none"/>` : '');
  }

  setBackground(markup) { this.bg.innerHTML = this.gridMarkup() + markup; }
  setOverlay(markup) { this.ov.innerHTML = markup || ''; }

  resize() {
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const { w, h: H } = this.o;
    const k = Math.min(r.width / w, r.height / H);
    this.k = k;
    this.stage.style.width = w * k + 'px';
    this.stage.style.height = H * k + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(w * k * dpr);
    this.canvas.height = Math.round(H * k * dpr);
    this.ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
    this.redraw();
  }

  pt(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * this.o.w,
      y: (e.clientY - r.top) / r.height * this.o.h,
      p: e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5,
    };
  }
  snapPt(p) {
    const c = this.o.cell;
    if (!this.o.snap || !c) return { x: p.x, y: p.y };
    return { x: Math.round(p.x / c) * c, y: Math.round(p.y / c) * c };
  }

  bind() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', e => {
      if (e.pointerType === 'pen' && state.mode !== 'pen') {
        setMode('pen');
        toast('Stift erkannt: Jetzt zeichnet nur noch der Stift – die Hand darf aufliegen.');
      }
      if (state.mode === 'pen' && e.pointerType === 'touch') return; // Handballen ignorieren
      if (this.cur) return;
      if (e.button && e.button !== 0) return;
      if (!this.k || !this.canvas.getBoundingClientRect().width) this.resize();
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      this.pid = e.pointerId;
      const p = this.pt(e);
      if (this.tool === 'erase') {
        this.cur = { erase: true };
        this.snapshot();
        this.eraseAt(p);
      } else if (this.tool === 'line') {
        const s = this.snapPt(p);
        this.cur = { type: 'line', style: this.style, pts: [s, s] };
      } else {
        this.cur = { type: 'free', style: this.style, pen: e.pointerType === 'pen', pts: [p] };
      }
      this.redraw();
    });
    const move = e => {
      if (!this.cur || e.pointerId !== this.pid) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (this.cur.erase) { evs.forEach(ev => this.eraseAt(this.pt(ev))); return; }
      if (this.cur.type === 'line') {
        this.cur.pts[1] = this.snapPt(this.pt(e));
        this.redraw();
      } else {
        const pts = this.cur.pts;
        for (const ev of (evs.length ? evs : [e])) {
          const p = this.pt(ev); const l = pts[pts.length - 1];
          if (Math.hypot(p.x - l.x, p.y - l.y) > 0.6) pts.push(p);
        }
        this.drawLiveFree();
      }
    };
    const up = e => {
      if (!this.cur || e.pointerId !== this.pid) return;
      const c = this.cur; this.cur = null;
      if (c.erase) { this.changed(); return; }
      this.snapshot();
      this.strokes.push(c);
      this.redraw(); this.changed();
    };
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  }

  snapshot() { this.history.push(this.strokes.slice()); if (this.history.length > 80) this.history.shift(); }
  undo() { if (!this.history.length) return; this.strokes = this.history.pop(); this.redraw(); this.changed(); }
  clear() { if (!this.strokes.length) return; this.snapshot(); this.strokes = []; this.redraw(); this.changed(); }
  changed() { this.o.onChange && this.o.onChange(this); }

  eraseAt(p) {
    const r = 9;
    const before = this.strokes.length;
    this.strokes = this.strokes.filter(s => !hits(s, p, r));
    if (this.strokes.length !== before) this.redraw();
  }

  redraw() {
    const { w, h: H } = this.o;
    const c = this.ctx;
    c.clearRect(0, 0, w, H);
    for (const s of this.strokes) drawStroke(c, s);
    if (this.cur && !this.cur.erase) drawStroke(c, this.cur);
  }
  drawLiveFree() {
    // nur das letzte Stück zeichnen (flüssiger auf dem iPad)
    const pts = this.cur.pts;
    if (pts.length < 2) return;
    drawStroke(this.ctx, { ...this.cur, pts: pts.slice(-3) });
  }

  // Tinte ohne Hintergrund auf eine eigene Fläche zeichnen (für die Auswertung)
  inkImage(scale = 1) {
    const { w, h: H } = this.o;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * scale); cv.height = Math.ceil(H * scale);
    const c = cv.getContext('2d');
    c.setTransform(scale, 0, 0, scale, 0, 0);
    for (const s of this.strokes) drawStroke(c, s, '#000');
    return c.getImageData(0, 0, cv.width, cv.height);
  }

  setTool(t) { this.tool = t; }
  setStyle(s) { this.style = s; }
  destroy() { this.ro.disconnect(); }
}

function hits(s, p, r) {
  const pts = s.pts;
  if (pts.length === 1) return Math.hypot(pts[0].x - p.x, pts[0].y - p.y) < r;
  for (let i = 1; i < pts.length; i++) if (segDist(p, pts[i - 1], pts[i]) < r) return true;
  return false;
}
export function segDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y; const L = dx * dx + dy * dy;
  let t = L ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function drawStroke(c, s, color = '#23262B') {
  const st = STYLES[s.style] || STYLES.wide;
  c.strokeStyle = color; c.fillStyle = color;
  c.lineCap = 'round'; c.lineJoin = 'round';
  const pts = s.pts;
  if (s.type === 'line') {
    const [a, b] = pts;
    if (Math.hypot(b.x - a.x, b.y - a.y) < 1.5) { // Punkt
      c.beginPath(); c.arc(a.x, a.y, Math.max(1.3, st.w * 0.85), 0, Math.PI * 2); c.fill(); return;
    }
    c.lineWidth = st.w;
    c.lineCap = st.dash ? 'butt' : 'round';
    c.setLineDash(st.dash || []);
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    c.setLineDash([]);
    return;
  }
  if (pts.length === 1) {
    c.beginPath(); c.arc(pts[0].x, pts[0].y, Math.max(1.2, st.w * 0.7), 0, Math.PI * 2); c.fill(); return;
  }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const pr = s.pen ? (0.55 + 0.9 * ((a.p + b.p) / 2)) : 1;
    c.lineWidth = Math.max(0.9, st.w * pr);
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  }
}

// Werkzeugleiste für eine Zeichenfläche
export function toolbar(pad, { tools = ['free', 'line', 'erase'], styles = ['wide', 'thin', 'dash', 'dashdot'], extra = [] } = {}) {
  const names = { free: ['pen', 'Stift'], line: ['ruler', 'Lineal'], erase: ['eraser', 'Radierer'] };
  const bar = h('div', { class: 'toolbar' });
  const toolBtns = tools.map(t => h('button', { class: 'tb' + (pad.tool === t ? ' on' : ''), 'data-t': t, html: icon(names[t][0]) + `<span>${names[t][1]}</span>`, onclick: () => {
    pad.setTool(t); toolBtns.forEach(b => b.classList.toggle('on', b.dataset.t === t));
    if (t !== 'erase') styleBtns.forEach(b => b.classList.toggle('dim', false));
  } }));
  const styleBtns = styles.map(s => {
    const st = STYLES[s];
    const dash = st.dash ? `stroke-dasharray="${st.dash.join(' ')}"` : '';
    return h('button', { class: 'tb style' + (pad.style === s ? ' on' : ''), 'data-s': s,
      html: `<svg viewBox="0 0 40 18"><path d="M2 9H38" stroke-width="${st.w * 1.1}" ${dash}/></svg><span>${st.label}</span>`,
      onclick: () => {
        pad.setStyle(s); styleBtns.forEach(b => b.classList.toggle('on', b.dataset.s === s));
        if (pad.tool === 'erase') { const t = tools.includes('line') ? 'line' : 'free'; pad.setTool(t); toolBtns.forEach(b => b.classList.toggle('on', b.dataset.t === t)); }
      } });
  });
  let armed = false, armTimer;
  const clearBtn = h('button', { class: 'tb', html: icon('trash') + '<span>Alles weg</span>', onclick: () => {
    if (!armed) { armed = true; clearBtn.classList.add('warn'); clearBtn.querySelector('span').textContent = 'Sicher?'; armTimer = setTimeout(reset, 2500); return; }
    reset(); pad.clear();
  } });
  const reset = () => { armed = false; clearTimeout(armTimer); clearBtn.classList.remove('warn'); clearBtn.querySelector('span').textContent = 'Alles weg'; };
  bar.append(...toolBtns);
  if (styleBtns.length) bar.append(h('span', { class: 'sep' }), ...styleBtns);
  bar.append(h('span', { class: 'sep' }),
    h('button', { class: 'tb', html: icon('undo') + '<span>Zurück</span>', onclick: () => pad.undo() }),
    clearBtn, ...extra);
  return bar;
}
