import { h, icon } from '../ui.js';
import { Pad, toolbar } from '../pad.js';

const W = 900, RH = 112, ZX = 210, ZW = 674;
const ROWS = [
  { kind: 'dash', name: 'Strichlinie', use: 'unsichtbare (verdeckte) Kanten', need: 2, sample: 'stroke-width="2" stroke-dasharray="9 5"' },
  { kind: 'wide', name: 'Breite Volllinie', use: 'sichtbare Kanten', need: 3, sample: 'stroke-width="3.4"' },
  { kind: 'thin', name: 'Schmale Volllinie', use: 'Bemaßungslinien', need: 3, sample: 'stroke-width="1.3"' },
  { kind: 'dashdot', name: 'Strichpunktlinie', use: 'Mittellinien', need: 2, sample: 'stroke-width="1.3" stroke-dasharray="16 4 2 4"' },
];
const NAMES = { dash: 'Strichlinie', wide: 'breite Volllinie', thin: 'schmale Volllinie', dashdot: 'Strichpunktlinie', solid: 'Volllinie' };

function bg() {
  return ROWS.map((r, i) => {
    const y = i * RH;
    return `<g>
      ${i ? `<path d="M0 ${y}H${W}" stroke="var(--ink)" stroke-width="1"/>` : ''}
      <text x="14" y="${y + 30}" font-family="Barlow Condensed" font-weight="700" font-size="21" fill="var(--ink)">${i + 1} · ${r.name.toUpperCase()}</text>
      <text x="14" y="${y + 52}" font-family="Atkinson Hyperlegible" font-size="14" fill="var(--mute)">für ${r.use}</text>
      <path d="M14 ${y + 86}H176" stroke="var(--ink)" fill="none" ${r.sample}/>
      <rect x="${ZX}" y="${y + 10}" width="${ZW}" height="${RH - 20}" rx="10" fill="none" stroke="var(--soft)" stroke-width="1.5"/>
      ${[0.3, 0.55, 0.8].map(f => `<path d="M${ZX + 16} ${y + 10 + (RH - 20) * f}H${ZX + ZW - 16}" stroke="rgba(35,38,43,.12)" stroke-dasharray="1 6" stroke-linecap="round" stroke-width="2"/>`).join('')}
    </g>`;
  }).join('');
}

function analyse(strokes) {
  const rows = ROWS.map(() => []);
  for (const s of strokes) {
    const pts = s.pts;
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const seg = { len, x0: Math.min(...xs), x1: Math.max(...xs), y: (Math.min(...ys) + Math.max(...ys)) / 2, style: s.style, dot: len < 6 };
    const r = Math.floor(seg.y / RH);
    if (r >= 0 && r < ROWS.length && seg.x1 > ZX - 10) rows[r].push(seg);
  }
  return rows.map(segs => {
    segs.sort((a, b) => a.y - b.y);
    const clusters = [];
    for (const s of segs) {
      const c = clusters.find(c => Math.abs(c.y - s.y) < 13);
      if (c) { c.segs.push(s); c.y = c.segs.reduce((t, x) => t + x.y, 0) / c.segs.length; } else clusters.push({ y: s.y, segs: [s] });
    }
    return clusters.map(c => {
      const lines = c.segs.filter(s => !s.dot), dots = c.segs.length - lines.length;
      const x0 = Math.min(...c.segs.map(s => s.x0)), x1 = Math.max(...c.segs.map(s => s.x1));
      const span = x1 - x0, sum = lines.reduce((t, s) => t + s.len, 0);
      const wide = lines.filter(s => s.style === 'wide').length >= lines.length / 2;
      let kind = 'unclear';
      if (!lines.length) kind = 'dots';
      else if (lines.length <= 2 && sum / span > 0.85 && !dots) kind = wide ? 'wide' : 'thin';
      else if (dots >= 2 && lines.length >= 2) kind = 'dashdot';
      else if (lines.length >= 4) kind = 'dash';
      return { kind, span, n: lines.length, dots, avg: lines.length ? sum / lines.length : 0, wide };
    });
  });
}

export default {
  id: 3, title: 'Linienarten zeichnen', tag: 'Zeichnen', min: 15,
  icon: '<path d="M6 10h36" stroke-width="4"/><path d="M6 20h36" stroke-dasharray="6 4"/><path d="M6 30h36" stroke-dasharray="11 3 2 3"/><path d="M6 40h36" stroke-width="1.2"/>',
  render(root, ctx) {
    let checks = 0;
    ctx.steps(1, 0);
    root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, 'Aufgabe'),
      h('span', {}, 'In Technischen Zeichnungen haben Linien eine Bedeutung. Zeichne jede Linie ', h('b', {}, 'mehrmals'), ' ab – mit dem ', h('b', {}, 'Lineal'),
        '-Werkzeug. Strichlinien und Strichpunktlinien setzt du wie auf Papier aus kurzen Strichen zusammen. ', h('b', {}, 'Einen Punkt'), ' machst du durch kurzes Tippen.')));

    const padHost = h('div', { class: 'pad' });
    const pad = new Pad(padHost, { w: W, h: RH * ROWS.length, bg: bg(), tool: 'line', style: 'thin' });
    const checkBtn = h('button', { class: 'btn primary', html: icon('check') + 'Prüfen', onclick: check });
    root.append(h('div', { class: 'row' }, toolbar(pad, { tools: ['line', 'free', 'erase'], styles: ['wide', 'thin'] }), h('span', { class: 'grow' }), checkBtn));
    root.append(padHost);

    function check() {
      checks++;
      const res = analyse(pad.strokes);
      const probs = [];
      let allOk = true;
      res.forEach((cl, i) => {
        const r = ROWS[i];
        const long = cl.filter(c => c.span >= ZW * 0.45);
        const good = long.filter(c => c.kind === r.kind).length;
        if (good >= r.need) return;
        allOk = false;
        const z = `<b>Zeile ${i + 1} (${r.name}):</b> `;
        if (!cl.length) { probs.push(z + 'Hier fehlen noch Linien.'); return; }
        if (cl.length && !long.length) { probs.push(z + 'Deine Linien sind zu kurz. Zieh sie fast über das ganze Feld.'); return; }
        const kinds = long.map(c => c.kind);
        if ((r.kind === 'wide' || r.kind === 'thin') && kinds.includes(r.kind === 'wide' ? 'thin' : 'wide'))
          probs.push(z + (r.kind === 'wide' ? 'Deine Linien sind schmal. Sichtbare Kanten zeichnet man mit der <b>breiten</b> Volllinie – wähle oben „breit“.' : 'Deine Linien sind breit. Bemaßungslinien zeichnet man <b>schmal</b> – wähle oben „schmal“.'));
        else if ((r.kind === 'wide' || r.kind === 'thin') && kinds.some(k => k === 'dash' || k === 'dashdot' || k === 'unclear'))
          probs.push(z + 'Hier gehört eine <b>durchgehende</b> Linie hin – ohne Lücken. Zieh sie mit dem Lineal in einem Zug.');
        else if (r.kind === 'dash' && kinds.some(k => k === 'wide' || k === 'thin'))
          probs.push(z + 'Das ist eine durchgehende Linie. Eine Strichlinie besteht aus <b>vielen kurzen Strichen</b> mit kleinen Lücken.');
        else if (r.kind === 'dash' && kinds.includes('dashdot'))
          probs.push(z + 'Bei der Strichlinie gibt es <b>keine Punkte</b> – nur kurze Striche.');
        else if (r.kind === 'dashdot' && kinds.includes('dash'))
          probs.push(z + 'Zwischen den langen Strichen fehlen die <b>Punkte</b>. Tippe kurz zwischen zwei Striche.');
        else if (r.kind === 'dashdot' && kinds.some(k => k === 'wide' || k === 'thin'))
          probs.push(z + 'Die Strichpunktlinie wechselt ab: <b>langer Strich – Punkt – langer Strich</b>.');
        else if (good > 0)
          probs.push(z + `Schon ${good} richtig – zeichne noch ${r.need - good} weitere.`);
        else
          probs.push(z + 'Schau dir das Muster links noch einmal genau an und zeichne es nach.');
      });
      if (pad.strokes.some(s => s.type === 'free') && !allOk) probs.push('Tipp: Mit dem <b>Lineal</b>-Werkzeug werden deine Striche ganz gerade.');
      if (allOk) {
        ctx.complete(checks === 1 ? 3 : checks <= 3 ? 2 : 1, 'Alle vier Linienarten sitzen. Merke: <b>breit</b> = sichtbare Kante, <b>schmal</b> = Maße, <b>Striche</b> = unsichtbare Kante, <b>Strich-Punkt</b> = Mitte.');
      } else {
        ctx.feedback({ kind: 'bad', title: 'Fast geschafft – noch nicht alles passt', list: probs });
      }
    }
    return () => pad.destroy();
  },
};
