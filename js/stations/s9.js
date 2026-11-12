import { h, svg, icon, numpad, toast } from '../ui.js';
import { arrow } from '../drawings.js';
import { pointInPoly } from '../geom.js';

const MM = 4, OX = 110, OY = 110, VW = 470, VH = 372;
const SHAPE = [[0, 0], [60, 0], [60, 26], [42, 26], [42, 38], [12, 38], [12, 26], [0, 26]];
const X = mm => OX + mm * MM, Y = mm => OY + mm * MM;
const shapePath = () => 'M' + SHAPE.map(([x, y]) => `${X(x)},${Y(y)}`).join('L') + 'Z';

const EDGES = [
  { k: 'a', v: 60, at: [30, 0], lab: [30, -6] },
  { k: 'b', v: 26, at: [0, 13], lab: [-6, 13] },
  { k: 'c', v: 30, at: [27, 38], lab: [27, 44] },
  { k: 'd', v: 12, at: [42, 32], lab: [48, 32] },
  { k: 'e', v: 12, at: [6, 26], lab: [6, 32] },
];

// ---------- verschiebbares Lineal ----------
function ruler(host, svgEl) {
  let tx = X(0) - 60, ty = Y(0) - 92, rot = 0;
  let ticks = '';
  for (let mm = 0; mm <= 80; mm++) {
    const l = mm % 10 === 0 ? 20 : mm % 5 === 0 ? 13 : 8;
    ticks += `M${mm * MM},0v${l}`;
  }
  let nums = '';
  for (let cm = 0; cm <= 8; cm++) nums += `<text x="${cm * 10 * MM}" y="33" text-anchor="middle" font-size="11" font-family="Atkinson Hyperlegible" fill="#23262B">${cm}</text>`;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'ruler');
  g.style.cursor = 'grab';
  g.innerHTML = `<rect x="-10" y="0" width="${80 * MM + 20}" height="44" rx="4" fill="rgba(255,236,170,.72)" stroke="#9C8A4E" stroke-width="1.2"/>
    <path d="${ticks}" stroke="#23262B" stroke-width="0.8"/>${nums}
    <text x="${40 * MM}" y="41" text-anchor="middle" font-size="8" fill="#6E6A62" font-family="Atkinson Hyperlegible">mm</text>`;
  svgEl.append(g);
  const upd = () => g.setAttribute('transform', `translate(${tx},${ty}) rotate(${rot})`);
  upd();
  const pt = e => { const p = svgEl.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svgEl.getScreenCTM().inverse()); };
  g.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    const s = pt(e), st = { x: tx, y: ty };
    g.setPointerCapture(e.pointerId);
    const mv = ev => { const p = pt(ev); tx = st.x + p.x - s.x; ty = st.y + p.y - s.y; upd(); };
    const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); };
    g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
  });
  return {
    rotate() { rot = (rot + 90) % 360; upd(); },
    reset() { tx = X(0) - 60; ty = Y(0) - 92; rot = 0; upd(); },
    show(v) { g.style.display = v ? '' : 'none'; },
  };
}

function rulerButtons(r) {
  return [
    h('button', { class: 'tb', html: icon('rotate') + '<span>Drehen</span>', onclick: () => r.rotate() }),
    h('button', { class: 'tb', html: icon('undo') + '<span>Lineal zurück</span>', onclick: () => r.reset() }),
  ];
}

// ---------- Bemaßung zeichnen ----------
function dimMarkup(d, cls = '') {
  const s = d.o === 'h' ? Math.sign(d.at - d.p1[1]) || -1 : Math.sign(d.at - d.p1[0]) || -1;
  let m = `<g class="dimg ${cls}" data-id="${d.id ?? ''}">`;
  if (d.o === 'h') {
    const [a, b] = [d.p1, d.p2].sort((p, q) => p[0] - q[0]);
    const y = Y(d.at);
    for (const p of [a, b]) { const sg = Math.sign(d.at - p[1]) || s; m += `<path class="thin" d="M${X(p[0])},${Y(p[1]) + sg * 1}V${y + sg * 2 * MM}"/>`; }
    m += `<path class="thin" d="M${X(a[0])},${y}H${X(b[0])}"/>${arrow(X(a[0]), y, 'l', 10, 3)}${arrow(X(b[0]), y, 'r', 10, 3)}`;
    if (d.value != null) m += `<text class="dim" x="${(X(a[0]) + X(b[0])) / 2}" y="${y - 5}" text-anchor="middle">${d.value}</text>`;
    m += `<rect x="${X(a[0])}" y="${y - 14}" width="${X(b[0]) - X(a[0])}" height="22" fill="transparent"/>`;
  } else {
    const [a, b] = [d.p1, d.p2].sort((p, q) => p[1] - q[1]);
    const x = X(d.at);
    for (const p of [a, b]) { const sg = Math.sign(d.at - p[0]) || s; m += `<path class="thin" d="M${X(p[0]) + sg * 1},${Y(p[1])}H${x + sg * 2 * MM}"/>`; }
    m += `<path class="thin" d="M${x},${Y(a[1])}V${Y(b[1])}"/>${arrow(x, Y(a[1]), 'u', 10, 3)}${arrow(x, Y(b[1]), 'd', 10, 3)}`;
    if (d.value != null) m += `<text class="dim" transform="translate(${x - 5},${(Y(a[1]) + Y(b[1])) / 2}) rotate(-90)" text-anchor="middle">${d.value}</text>`;
    m += `<rect x="${x - 14}" y="${Y(a[1])}" width="22" height="${Y(b[1]) - Y(a[1])}" fill="transparent"/>`;
  }
  return m + '</g>';
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function info(d) {
  const lo = d.o === 'h' ? Math.min(d.p1[0], d.p2[0]) : Math.min(d.p1[1], d.p2[1]);
  const hi = d.o === 'h' ? Math.max(d.p1[0], d.p2[0]) : Math.max(d.p1[1], d.p2[1]);
  let dist = Infinity, inside = false;
  for (let t = 0.04; t < 0.97; t += 0.04) {
    const u = lo + (hi - lo) * t;
    const [px, py] = d.o === 'h' ? [u, d.at] : [d.at, u];
    if (pointInPoly(px, py, SHAPE)) inside = true;
    // Abstand senkrecht zur Maßlinie bis zur nächsten Werkstückkante
    for (let i = 0; i < SHAPE.length; i++) {
      const [ax, ay] = SHAPE[i], [bx, by] = SHAPE[(i + 1) % SHAPE.length];
      if (d.o === 'h' && ay === by && px >= Math.min(ax, bx) && px <= Math.max(ax, bx)) dist = Math.min(dist, Math.abs(py - ay));
      if (d.o === 'v' && ax === bx && py >= Math.min(ay, by) && py <= Math.max(ay, by)) dist = Math.min(dist, Math.abs(px - ax));
    }
  }
  const mid = d.o === 'h' ? 19 : 30;
  return { lo, hi, len: hi - lo, dist: Math.round(dist), inside, side: d.at < mid ? -1 : 1 };
}

export default {
  id: 9, title: 'Messen und Bemaßen', tag: 'Messen', min: 20,
  icon: '<path d="M6 32l26-26 10 10-26 26z"/><path d="M12 26l4 4M17 21l3 3M22 16l4 4M27 11l3 3"/>',
  render(root, ctx) {
    let wrongMeasure = 0, checks = 0;
    measure();

    // ---------- Schritt 1: Messen ----------
    function measure() {
      ctx.steps(2, 0); ctx.hideFeedback();
      root.innerHTML = '';
      root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, 'Schritt 1'),
        h('span', {}, 'Bevor man bemaßt, muss man messen. ', h('b', {}, 'Schiebe das Lineal'), ' an die Kanten a bis e und miss ihre Länge in ', h('b', {}, 'Millimetern'), '. Lege die 0 genau an den Anfang der Kante.')));
      let lab = '';
      for (const e of EDGES) lab += `<circle cx="${X(e.lab[0])}" cy="${Y(e.lab[1])}" r="11" fill="var(--acc)"/><text x="${X(e.lab[0])}" y="${Y(e.lab[1]) + 5}" text-anchor="middle" font-family="Barlow Condensed" font-weight="700" font-size="16" fill="#fff">${e.k}</text>`;
      const pic = svg(`<path class="wp" d="${shapePath()}"/>${lab}`, `0 0 ${VW} ${VH}`);
      pic.style.touchAction = 'none';
      const r = ruler(null, pic);
      const inputs = {};
      const fields = EDGES.map(e => {
        const inp = h('input', { inputmode: 'numeric', pattern: '[0-9]*', maxlength: '3', 'aria-label': `Länge ${e.k} in mm` });
        inputs[e.k] = inp;
        return h('label', { class: 'inp' }, h('b', {}, e.k), inp, h('span', {}, 'mm'));
      });
      const side = h('div', { class: 'side' },
        h('span', { class: 'lbl' }, 'Lineal'), h('div', { class: 'toolbar' }, rulerButtons(r)),
        h('span', { class: 'lbl' }, 'Deine Messwerte'), h('div', { class: 'inputs' }, fields),
        h('button', { class: 'btn primary', html: icon('check') + 'Prüfen', onclick: check }));
      root.append(h('div', { class: 'split' }, h('div', { class: 'sheet' }, pic), side));

      function check() {
        const probs = [];
        let allOk = true;
        for (const e of EDGES) {
          const raw = inputs[e.k].value.trim().replace(',', '.');
          const v = parseFloat(raw);
          const lbl = inputs[e.k].parentElement;
          lbl.classList.remove('ok', 'bad');
          if (!raw) { allOk = false; probs.push(`<b>${e.k}</b>: noch kein Wert.`); continue; }
          if (Math.abs(v - e.v) <= 1) { lbl.classList.add('ok'); continue; }
          allOk = false; lbl.classList.add('bad'); wrongMeasure++;
          if (Math.abs(v * 10 - e.v) <= 1) probs.push(`<b>${e.k}</b>: Achtung Einheit! Gib die Länge in <b>Millimetern</b> an (1 cm = 10 mm).`);
          else probs.push(`<b>${e.k}</b>: ${v} mm stimmt nicht. Lege die <b>0</b> genau an den Anfang der Kante und lies am Ende ab.`);
        }
        if (allOk) {
          ctx.feedback({ kind: 'ok', title: 'Richtig gemessen!', text: 'Alle Längen stimmen. Jetzt trägst du die Maße in die Zeichnung ein.', actions: [{ label: 'Weiter zum Bemaßen', cls: 'primary', onClick: dimension }] });
        } else ctx.feedback({ kind: 'bad', title: 'Noch nicht alles richtig', list: probs });
      }
    }

    // ---------- Schritt 2: Bemaßen ----------
    function dimension() {
      ctx.steps(2, 1); ctx.hideFeedback();
      root.innerHTML = '';
      const dims = [], hist = [];
      let mode = 'dim', p1 = null, p2 = null, preview = null, nextId = 1;
      root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, 'Schritt 2'),
        h('span', {}, 'Bemaße das Werkstück vollständig: ', h('b', {}, 'Tippe zwei Ecken an'), ', dann tippe dorthin, wo die Maßlinie liegen soll, und gib die Maßzahl ein. Denk an die Regeln: ', h('b', {}, '10 mm'), ' Abstand zur Kante, jede weitere Maßlinie ', h('b', {}, '7 mm'), ' weiter.')));
      const pic = svg('', `0 0 ${VW} ${VH}`);
      pic.style.touchAction = 'none';
      const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      pic.append(layer);
      const r = ruler(null, pic); r.show(false);
      const status = h('div', { class: 'box', style: { fontSize: '16px', minHeight: '64px' } });
      const modeBtns = {
        dim: h('button', { class: 'tb on', html: '<svg viewBox="0 0 24 24"><path d="M3 8v10M21 8v10M3 13h18"/><path d="M3 13l4-2v4zM21 13l-4-2v4z" fill="currentColor"/></svg><span>Bemaßen</span>', onclick: () => setMode('dim') }),
        erase: h('button', { class: 'tb', html: icon('eraser') + '<span>Löschen</span>', onclick: () => setMode('erase') }),
      };
      let rulerOn = false;
      const rulerBtn = h('button', { class: 'tb', html: icon('ruler') + '<span>Lineal</span>', onclick: () => { rulerOn = !rulerOn; r.show(rulerOn); rulerBtn.classList.toggle('on', rulerOn); } });
      const side = h('div', { class: 'side' },
        h('span', { class: 'lbl' }, 'Werkzeuge'),
        h('div', { class: 'toolbar' }, modeBtns.dim, modeBtns.erase, h('button', { class: 'tb', html: icon('undo') + '<span>Zurück</span>', onclick: undo }), rulerBtn, ...rulerButtons(r).slice(0, 1)),
        status,
        h('div', { class: 'box', style: { fontSize: '15px' }, html: '<b>Regeln</b><ul style="margin:6px 0 0;padding-left:18px"><li>Maße stehen <b>außerhalb</b> des Werkstücks.</li><li>Erste Maßlinie: <b>10 mm</b> von der Kante.</li><li>Jede weitere: <b>7 mm</b> weiter außen.</li><li>Maßzahl in <b>mm</b>, ohne „mm“.</li></ul>' }),
        h('button', { class: 'btn primary', html: icon('check') + 'Prüfen', onclick: check }),
        h('button', { class: 'btn small flat', onclick: measure }, '← zurück zum Messen'));
      root.append(h('div', { class: 'split' }, h('div', { class: 'sheet' }, pic), side));

      function setMode(m) { mode = m; p1 = p2 = preview = null; Object.entries(modeBtns).forEach(([k, b]) => b.classList.toggle('on', k === m)); draw(); }
      function undo() { if (!hist.length) return; const s = hist.pop(); dims.length = 0; dims.push(...s); draw(); }
      const snap = () => hist.push(dims.slice());

      function say(t) { status.innerHTML = t; }
      function draw() {
        let m = `<path class="wp" d="${shapePath()}"/>`;
        m += dims.map(d => dimMarkup(d, mode === 'erase' ? 'erasable' : '')).join('');
        if (preview) m += `<g opacity=".6">${dimMarkup(preview)}</g>`;
        if (mode === 'dim') for (const [x, y] of SHAPE) {
          const on = (p1 && p1[0] === x && p1[1] === y) || (p2 && p2[0] === x && p2[1] === y);
          m += `<circle cx="${X(x)}" cy="${Y(y)}" r="${on ? 7 : 5}" fill="${on ? 'var(--acc)' : 'var(--paper)'}" stroke="var(--acc)" stroke-width="2"/>` +
            `<circle data-c="${x},${y}" cx="${X(x)}" cy="${Y(y)}" r="16" fill="transparent"/>`;
        }
        layer.innerHTML = m;
        if (mode === 'erase') say('Tippe eine Bemaßung an, um sie zu löschen.');
        else if (!p1) say('Tippe die <b>erste Ecke</b> an.');
        else if (!p2) say('Tippe die <b>zweite Ecke</b> an.');
        else say(preview ? `Abstand zum Werkstück: <b>${info(preview).dist} mm</b><br>Tippe, um die Maßlinie hier hinzulegen.` : 'Tippe dorthin, wo die <b>Maßlinie</b> liegen soll (außerhalb!).');
      }
      const pt = e => { const p = pic.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(pic.getScreenCTM().inverse()); return [(q.x - OX) / MM, (q.y - OY) / MM]; };

      function makePreview(e) {
        const [mx, my] = pt(e);
        const dx = Math.abs(p1[0] - p2[0]), dy = Math.abs(p1[1] - p2[1]);
        let o;
        if (!dy) o = 'h'; else if (!dx) o = 'v';
        else {
          const outY = Math.max(0, Math.min(p1[1], p2[1]) - my, my - Math.max(p1[1], p2[1]));
          const outX = Math.max(0, Math.min(p1[0], p2[0]) - mx, mx - Math.max(p1[0], p2[0]));
          o = outY >= outX ? 'h' : 'v';
        }
        preview = { o, p1, p2, at: Math.round(o === 'h' ? my : mx) };
        draw();
      }

      pic.addEventListener('pointerdown', e => {
        if (e.target.closest('.ruler')) return;
        if (mode === 'erase') {
          const g = e.target.closest('.dimg');
          if (g) { snap(); const i = dims.findIndex(d => String(d.id) === g.dataset.id); if (i >= 0) dims.splice(i, 1); draw(); }
          return;
        }
        const c = e.target.closest('[data-c]');
        if (c && (!p1 || !p2)) {
          const pnt = c.dataset.c.split(',').map(Number);
          if (!p1) p1 = pnt; else if (pnt[0] !== p1[0] || pnt[1] !== p1[1]) p2 = pnt;
          draw(); return;
        }
        if (p1 && p2) { e.preventDefault(); makePreview(e); try { pic.setPointerCapture(e.pointerId); } catch (_) {} pic._placing = true; }
      });
      pic.addEventListener('pointermove', e => { if (p1 && p2 && mode === 'dim') makePreview(e); });
      pic.addEventListener('pointerup', e => {
        if (!pic._placing) return;
        pic._placing = false;
        const d = preview;
        if (!d) return;
        const inf = info(d);
        if (inf.inside) { toast('Die Maßlinie liegt im Werkstück – Maße gehören nach außen.'); }
        numpad(`Maßzahl für diese Strecke`, v => {
          if (v == null) { preview = null; p1 = p2 = null; draw(); return; }
          snap();
          dims.push({ ...d, value: v, id: nextId++ });
          preview = null; p1 = p2 = null; draw();
        });
      });
      draw();

      function check() {
        checks++;
        const probs = [];
        const infos = dims.map(d => ({ d, i: info(d) }));
        // Maßzahlen
        for (const { d, i } of infos) {
          if (d.value !== i.len) probs.push(`Die Maßzahl <b>${d.value}</b> passt nicht zur Strecke. Miss mit dem Lineal nach (in mm).`);
          if (i.inside) probs.push(`Das Maß <b>${d.value}</b> liegt im Werkstück. Maße stehen <b>außerhalb</b>.`);
        }
        // Abstände 10 / 7 mm
        for (const { d, i } of infos) {
          if (i.inside) continue;
          const inner = infos.filter(o => o !== infos.find(x => x.d === d) && o.d.o === d.o && o.i.side === i.side && !o.i.inside &&
            Math.min(o.i.hi, i.hi) - Math.max(o.i.lo, i.lo) > 0 && o.i.dist < i.dist);
          const want = inner.length ? Math.max(...inner.map(o => o.i.dist)) + 7 : 10;
          if (Math.abs(i.dist - want) > 1) probs.push(inner.length
            ? `Das Maß <b>${d.value}</b> liegt ${i.dist} mm vom Werkstück entfernt. Es ist die nächste Maßlinie weiter außen – also <b>7 mm</b> weiter: hier ${want} mm.`
            : `Das Maß <b>${d.value}</b> liegt ${i.dist} mm von der Kante entfernt. Die erste Maßlinie gehört <b>10 mm</b> von der Kante weg.`);
        }
        // Vollständigkeit
        const has = (o, lo, hi) => infos.some(({ d, i }) => d.o === o && i.lo === lo && i.hi === hi);
        if (!has('h', 0, 60)) probs.push('Es fehlt noch die <b>Gesamtbreite</b> des Werkstücks.');
        if (!has('v', 0, 38)) probs.push('Es fehlt noch die <b>Gesamthöhe</b> des Werkstücks.');
        if (!has('h', 12, 42)) probs.push('Es fehlt noch die <b>Breite des unteren Teils</b>.');
        if (!has('h', 0, 12) && !has('h', 42, 60)) probs.push('Man weiß noch nicht, <b>wo</b> der untere Teil beginnt (Abstand zum Rand fehlt).');
        if (!has('v', 0, 26) && !has('v', 26, 38)) probs.push('Es fehlt noch die <b>Höhe des oberen Teils</b> (oder des unteren).');
        infos.forEach((a, n) => infos.slice(n + 1).forEach(b => {
          if (a.d.o === b.d.o && a.d.at === b.d.at && Math.min(a.i.hi, b.i.hi) - Math.max(a.i.lo, b.i.lo) > 0)
            probs.push(`Die Maße <b>${a.d.value}</b> und <b>${b.d.value}</b> liegen übereinander. Die äußere Maßlinie muss <b>7 mm</b> weiter weg.`);
        }));
        const keys = infos.map(({ d, i }) => d.o + i.lo + '-' + i.hi);
        if (keys.some((k, n) => keys.indexOf(k) !== n)) probs.push('Ein Maß hast du doppelt eingetragen. Jedes Maß nur <b>einmal</b> angeben.');
        if (!probs.length) {
          const st = checks <= 2 && wrongMeasure <= 1 ? 3 : checks <= 4 ? 2 : 1;
          ctx.complete(st, 'Vollständig und nach den Regeln bemaßt – damit könnte man das Werkstück jetzt bauen!');
        } else ctx.feedback({ kind: 'bad', title: 'Noch nicht vollständig', list: [...new Set(probs)].slice(0, 6) });
      }
    }
  },
};
