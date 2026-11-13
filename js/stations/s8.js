import { h, icon } from '../ui.js';
import { Pad, toolbar } from '../pad.js';
import { glyphPath, glyphSamples } from '../glyphs.js';

const PAGES = ['ABCDEFGH', 'IJKLMNOP', '0123456789'];
const W = 780, HG = 64, ROW = [{ top: 46, label: 'Nachspuren' }, { top: 216, label: 'Selbst schreiben' }], PH = 310;

function dense(strokes) {
  const out = [];
  for (const s of strokes) {
    const p = s.pts;
    if (p.length === 1) { out.push([p[0].x, p[0].y]); continue; }
    for (let i = 1; i < p.length; i++) {
      const n = Math.max(1, Math.ceil(Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y) / 2));
      for (let j = 0; j < n; j++) out.push([p[i - 1].x + (p[i].x - p[i - 1].x) * j / n, p[i - 1].y + (p[i].y - p[i - 1].y) * j / n]);
    }
    out.push([p[p.length - 1].x, p[p.length - 1].y]);
  }
  return out;
}
const near = (pts, q, tol) => pts.some(p => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 <= tol * tol);
function match(samples, ink, tol) {
  const cov = samples.filter(s => near(ink, s, tol)).length / samples.length;
  const prec = ink.filter(p => near(samples, p, tol)).length / ink.length;
  return { cov, prec };
}

export default {
  id: 8, title: 'Die Normschrift', tag: 'Schreiben', min: 15,
  icon: '<path d="M6 34l7-22 7 22M8.5 27h9"/><path d="M25 12v22h8a5 5 0 000-11h-8 7a5 5 0 000-11h-7"/><path d="M4 40h40" stroke-dasharray="4 3" stroke-width="1.2"/>',
  render(root, ctx) {
    let page = 0, checks = 0, totalChecks = 0, pad = null;
    show();

    function show() {
      if (pad) pad.destroy();
      ctx.steps(PAGES.length, page);
      ctx.hideFeedback();
      root.innerHTML = '';
      checks = 0;
      const chars = PAGES[page].split('');
      const cw = W / chars.length;
      let bg = '';
      ROW.forEach((r, ri) => {
        bg += `<text x="10" y="${r.top - 22}" font-family="Barlow Condensed" font-weight="700" font-size="17" fill="var(--mute)">${ri + 1} · ${r.label.toUpperCase()}</text>`;
        bg += `<path d="M0 ${r.top}H${W}M0 ${r.top + HG}H${W}" stroke="rgba(35,38,43,.28)" stroke-width="1" stroke-dasharray="7 5"/>`;
        bg += `<path d="M0 ${r.top + HG / 2}H${W}" stroke="rgba(35,38,43,.08)" stroke-width="1"/>`;
        chars.forEach((ch, i) => {
          const cx = cw * (i + 0.5);
          if (i) bg += `<path d="M${cw * i} ${r.top - 6}V${r.top + HG + 6}" stroke="rgba(35,38,43,.07)"/>`;
          if (ri === 0) bg += `<path d="${glyphPath(ch, cx, r.top, HG)}" fill="none" stroke="#D8D1C4" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` +
            `<path d="${glyphPath(ch, cx, r.top, HG)}" fill="none" stroke="#B9B1A3" stroke-width="1" stroke-dasharray="2 3"/>`;
        });
      });
      root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, `Blatt ${page + 1}/${PAGES.length}`),
        h('span', {}, 'In Technischen Zeichnungen schreibt man in ', h('b', {}, 'Normschrift'), ' – sie sieht immer gleich aus, damit jeder sie lesen kann. ',
          h('b', {}, 'Spure oben nach'), ' und ', h('b', {}, 'schreibe unten selbst'), ' – so groß, dass die Zeichen beide gestrichelten Linien berühren.')));
      const padHost = h('div', { class: 'pad' });
      pad = new Pad(padHost, { w: W, h: PH, bg, tool: 'free', style: 'wide', onChange: () => pad.setOverlay('') });
      root.append(h('div', { class: 'row' }, toolbar(pad, { tools: ['free', 'line', 'erase'], styles: ['wide', 'thin'] }), h('span', { class: 'grow' }),
        h('button', { class: 'btn primary', html: icon('check') + 'Prüfen', onclick: () => check(chars, cw) })), padHost);
    }

    function check(chars, cw) {
      checks++; totalChecks++;
      const ink = dense(pad.strokes);
      const res = [];
      const marks = [];
      ROW.forEach((r, ri) => chars.forEach((ch, i) => {
        const x0 = cw * i, x1 = cw * (i + 1), cx = cw * (i + 0.5);
        const pts = ink.filter(([x, y]) => x >= x0 && x < x1 && y > r.top - 30 && y < r.top + HG + 30);
        let st = 'ok', why = '';
        if (pts.length < 6) { st = 'bad'; why = 'fehlt noch'; }
        else if (ri === 0) {
          const m = match(glyphSamples(ch, cx, r.top, HG, 2), pts, 7);
          if (m.cov >= 0.8 && m.prec >= 0.72) st = 'ok';
          else if (m.cov >= 0.6 && m.prec >= 0.5) { st = 'fast'; why = m.cov < 0.8 ? 'ein Stück der Linie fehlt noch' : 'etwas neben der Vorlage'; }
          else { st = 'bad'; why = m.cov < 0.6 ? 'ein großer Teil fehlt' : 'zu weit neben der Vorlage'; }
        } else {
          const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]);
          const iy0 = Math.min(...ys), iy1 = Math.max(...ys), ih = iy1 - iy0, icx = (Math.min(...xs) + Math.max(...xs)) / 2;
          if (ih < HG * 0.6) { st = 'fast'; why = 'zu klein – schreibe von Linie zu Linie'; }
          else {
            const k = HG / ih;
            const norm = pts.map(([x, y]) => [(x - icx) * k + cx, (y - iy0) * k + r.top]);
            const m = match(glyphSamples(ch, cx, r.top, HG, 2), norm, 9);
            if (m.cov >= 0.9 && m.prec >= 0.8) st = 'ok';
            else if (m.cov >= 0.75 && m.prec >= 0.65) { st = 'fast'; why = m.cov < 0.9 ? 'ein Teil des Zeichens fehlt noch – vergleiche mit der Vorlage oben' : 'die Form weicht etwas ab'; }
            else { st = 'bad'; why = 'sieht noch anders aus als die Vorlage oben'; }
          }
        }
        res.push({ ch, ri, st, why });
        const my = r.top + HG + 16;
        marks.push(st === 'ok' ? `<circle cx="${cx}" cy="${my}" r="7" fill="var(--ok)"/><path d="M${cx - 3.5},${my}l2.5,2.5l4.5,-5" stroke="#fff" stroke-width="2" fill="none"/>`
          : `<circle cx="${cx}" cy="${my}" r="7" fill="${st === 'fast' ? 'var(--acc)' : 'var(--bad)'}"/><text x="${cx}" y="${my + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${st === 'fast' ? '~' : '!'}</text>`);
      }));
      pad.setOverlay(marks.join(''));
      const n = res.length, ok = res.filter(r => r.st === 'ok').length, bad = res.filter(r => r.st === 'bad');
      const pass = !bad.length && ok >= n * 0.7;
      if (pass) {
        if (page + 1 < PAGES.length) {
          ctx.feedback({ kind: 'ok', title: 'Sauber geschrieben!', text: `${ok} von ${n} Zeichen sind grün. Weiter mit dem nächsten Blatt.`, actions: [{ label: 'Nächstes Blatt', cls: 'primary', onClick: () => { page++; show(); } }] });
        } else {
          const st = totalChecks <= PAGES.length + 1 ? 3 : totalChecks <= PAGES.length * 2 + 1 ? 2 : 1;
          ctx.complete(st, 'Du beherrschst die Normschrift: gleichmäßig, senkrecht und gut lesbar.');
        }
        return;
      }
      const todo = res.filter(r => r.st !== 'ok');
      const EZ = {
        'fehlt noch': 'hier hast du noch <b>nichts</b> geschrieben.',
        'ein Stück der Linie fehlt noch': 'fahr die <b>ganze graue Linie</b> nach – ein Stück ist noch grau.',
        'etwas neben der Vorlage': 'bleib genauer <b>auf der grauen Linie</b>.',
        'ein großer Teil fehlt': 'da fehlt noch viel. Fahr <b>alle grauen Linien</b> nach.',
        'zu weit neben der Vorlage': 'du bist <b>neben</b> der grauen Linie. Fahr genau darauf.',
        'zu klein – schreibe von Linie zu Linie': 'schreib <b>größer</b>: oben die gestrichelte Linie berühren, unten auch.',
        'ein Teil des Zeichens fehlt noch – vergleiche mit der Vorlage oben': 'schau das Zeichen <b>oben</b> an. Da ist noch ein Strich mehr.',
        'die Form weicht etwas ab': 'fast! Schau oben, wie das Zeichen <b>genau</b> aussieht.',
        'sieht noch anders aus als die Vorlage oben': 'das sieht noch anders aus. Schau genau auf das Zeichen <b>darüber</b> und schreib es ab.',
      };
      ctx.feedback({ kind: 'bad', title: `${ok} von ${n} Zeichen sind grün`,
        text: 'Grün = gut, Orange = fast, Rot = nochmal. Für das nächste Blatt dürfen keine roten Zeichen übrig sein. Mit dem Radierer kannst du einzelne Striche wegnehmen.',
        easy: 'Unter jedem Zeichen ist ein Punkt. <b>Grün</b> = gut. <b>Orange</b> = fast. <b>Rot</b> = bitte nochmal. Mach alle roten Zeichen nochmal – mit dem <b>Radierer</b> kannst du sie vorher wegwischen.',
        list: todo.slice(0, 5).map(r => {
          const lab = `<b>${r.ch}</b> (${r.ri ? 'selbst geschrieben' : 'nachgespurt'}): `;
          return [lab + r.why, lab + (EZ[r.why] || r.why)];
        }).concat(todo.length > 5 ? [`… und ${todo.length - 5} weitere.`] : []) });
    }
    return () => pad && pad.destroy();
  },
};
