import { h, icon } from '../ui.js';
import { Pad, toolbar } from '../pad.js';
import { arrow } from '../drawings.js';

const C = 24;            // 1 Kästchen = 5 mm
const L = C, HW = 4.5;   // Pfeillänge und halbe Breite
// 6 Maßlinien: [xA, xB, y] in Pixeln
const LINES = [];
for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) LINES.push([(2.5 + c * 12) * C, (11.5 + c * 12) * C, (3.5 + r * 6.5) * C]);
const ENDS = [];
LINES.forEach(([a, b, y], i) => { ENDS.push({ n: i + 1, side: 'links', tip: [a, y], dir: 1 }); ENDS.push({ n: i + 1, side: 'rechts', tip: [b, y], dir: -1 }); });

function tri(e) { const [x, y] = e.tip; return [[x, y], [x + e.dir * L, y - HW], [x + e.dir * L, y + HW]]; }

function bg() {
  let m = '';
  LINES.forEach(([a, b, y], i) => {
    const ghost = i < 3;
    m += `<rect x="${a}" y="${y + 1.5 * C}" width="${b - a}" height="${C}" fill="none" stroke="var(--ink)" stroke-width="3"/>`;
    m += `<path d="M${a},${y + 1.5 * C - 2}V${y - 0.6 * C}M${b},${y + 1.5 * C - 2}V${y - 0.6 * C}M${a},${y}H${b}" stroke="var(--ink)" stroke-width="1.2" fill="none"/>`;
    m += `<text x="${a - 30}" y="${y + 10}" font-family="Barlow Condensed" font-weight="700" font-size="26" fill="var(--soft)">${i + 1}</text>`;
    m += `<text x="${(a + b) / 2}" y="${y - 6}" text-anchor="middle" font-family="Atkinson Hyperlegible" font-size="14" fill="var(--ink)">45</text>`;
    if (ghost) for (const e of ENDS.filter(e => e.n === i + 1)) m += `<path d="M${tri(e).map(p => p.join(',')).join('L')}Z" fill="rgba(224,85,43,.12)" stroke="var(--acc)" stroke-width="1" stroke-dasharray="2 2"/>`;
  });
  return m;
}

function inTri(p, t) {
  const s = (a, b, c) => (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]);
  const d1 = s(p, t[0], t[1]), d2 = s(p, t[1], t[2]), d3 = s(p, t[2], t[0]);
  return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));
}
function distSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l; t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function distTri(p, t) { return inTri(p, t) ? 0 : Math.min(distSeg(p, t[0], t[1]), distSeg(p, t[1], t[2]), distSeg(p, t[2], t[0])); }

function judge(img, S, e) {
  const t = tri(e), [tx, ty] = e.tip;
  const xMin = Math.min(tx - 0.6 * L * e.dir, tx + 2.2 * L * e.dir), xMax = Math.max(tx - 0.6 * L * e.dir, tx + 2.2 * L * e.dir);
  let inT = 0, areaT = 0, ink = 0, far = 0, outside = 0, tipInk = 0, tooLong = 0, tooWide = 0;
  for (let y = ty - L; y <= ty + L; y += 0.5) for (let x = xMin; x <= xMax; x += 0.5) {
    const px = Math.round(x * S), py = Math.round(y * S);
    if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
    const a = img.data[(py * img.width + px) * 4 + 3] > 60;
    const p = [x, y];
    const inside = inTri(p, t);
    if (inside) { areaT++; if (a) inT++; }
    if (!a) continue;
    ink++;
    const d = distTri(p, t);
    if (d > 3) {
      far++;
      if ((x - tx) * e.dir < -2) outside++;
      else if ((x - tx) * e.dir > L + 4) tooLong++;
      else tooWide++;
    }
    if (Math.hypot(x - tx, y - ty) < 4) tipInk++;
  }
  const cov = areaT ? inT / areaT : 0;
  if (ink < 12) return 'fehlt';
  if (outside > ink * 0.3) return 'aussen';
  if (far > areaT * 0.7) return tooLong > tooWide ? 'lang' : 'breit';
  if (cov < 0.55) return 'leer';
  if (!tipInk) return 'spitze';
  return 'ok';
}

const MSG = {
  fehlt: 'hier fehlt der Pfeil noch.',
  aussen: 'der Pfeil liegt außerhalb. Er sitzt <b>innen</b> und zeigt mit der Spitze auf die Maßhilfslinie.',
  lang: 'der Pfeil ist zu lang. Ein Maßpfeil ist nur etwa <b>5 mm</b> lang – ein Kästchen.',
  breit: 'der Pfeil ist zu dick oder ungenau. Maßpfeile sind <b>schlank</b> und spitz.',
  leer: 'der Pfeil ist noch nicht ganz <b>ausgemalt</b>.',
  spitze: 'die Spitze berührt die <b>Maßhilfslinie</b> nicht.',
};

export default {
  id: 7, title: 'Die Maßpfeile', tag: 'Zeichnen', min: 10,
  icon: '<path d="M5 24h22"/><path d="M27 15l16 9-16 9z" fill="currentColor"/>',
  render(root, ctx) {
    let checks = 0;
    ctx.steps(1, 0);
    const demo = `<path d="M10,30H150" stroke="var(--ink)" stroke-width="3"/>${arrow(250, 30, 'r', 100, 17).replace('class="ah"', 'fill="var(--ink)"')}
      <path d="M150,52V70M250,52V70M150,62H250" stroke="var(--ink)" stroke-width="1.2"/>${arrow(150, 62, 'l', 10, 3)}${arrow(250, 62, 'r', 10, 3)}
      <text x="200" y="88" text-anchor="middle" font-size="15" font-family="Atkinson Hyperlegible" fill="var(--ink)">5 mm = 1 Kästchen</text>`;
    root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, 'Aufgabe'),
      h('span', {}, 'Maßpfeile sind spitze Dreiecke, die ', h('b', {}, 'schwarz ausgemalt'), ' werden. Sie sind etwa ', h('b', {}, '5 mm'), ' lang – ein Kästchen. Zeichne an jede Maßlinie zwei Pfeile. Bei 1 bis 3 hilft dir eine Vorlage.')));
    const padHost = h('div', { class: 'pad' });
    const pad = new Pad(padHost, { w: 37 * C, h: 14 * C, cell: C, bg: bg(), tool: 'free', style: 'thin', onChange: () => pad.setOverlay('') });
    root.append(h('div', { class: 'row' },
      toolbar(pad, { tools: ['free', 'erase'], styles: ['thin', 'wide'] }),
      h('span', { class: 'grow' }),
      h('div', { class: 'box', style: { padding: '2px 8px' }, html: `<svg viewBox="0 0 270 95" style="width:200px;display:block">${demo}</svg>` }),
      h('button', { class: 'btn primary', html: icon('check') + 'Prüfen', onclick: check })), padHost);

    function check() {
      checks++;
      const S = 2;
      const img = pad.inkImage(S);
      const res = ENDS.map(e => ({ e, r: judge(img, S, e) }));
      const ok = res.filter(x => x.r === 'ok').length;
      pad.setOverlay(res.map(({ e, r }) => {
        const [x, y] = e.tip, cx = x + e.dir * L * 0.5, cy = y + 22;
        return r === 'ok'
          ? `<circle cx="${cx}" cy="${cy}" r="8" fill="var(--ok)"/><path d="M${cx - 4},${cy}l3,3l5,-6" stroke="#fff" stroke-width="2" fill="none"/>`
          : `<circle cx="${cx}" cy="${cy}" r="8" fill="var(--acc)"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">!</text>`;
      }).join(''));
      if (ok >= 10) {
        const st = ok === 12 && checks <= 2 ? 3 : checks <= 4 ? 2 : 1;
        ctx.complete(st, ok === 12 ? 'Alle 12 Maßpfeile sind schlank, spitz und ausgemalt.' : `${ok} von 12 Maßpfeilen sind richtig – das reicht für den Stempel!`);
        return;
      }
      const bad = res.filter(x => x.r !== 'ok');
      ctx.feedback({ kind: 'bad', title: `${ok} von 12 Pfeilen passen`,
        text: 'Die orangen Punkte zeigen, wo noch etwas fehlt. Für den Stempel brauchst du mindestens 10.',
        list: bad.slice(0, 4).map(({ e, r }) => `<b>Linie ${e.n} ${e.side}:</b> ${MSG[r]}`).concat(bad.length > 4 ? [`… und ${bad.length - 4} weitere.`] : []) });
    }
    return () => pad.destroy();
  },
};
