// Zeichenaufgabe auf Kästchenpapier mit automatischer Prüfung.
import { h, svg, icon, toast } from './ui.js';
import { Pad, toolbar } from './pad.js';
import { drawnEdges, compareGrid, edgesPath, polyEdges, addSeg } from './geom.js';

const fmt = x => (Math.round(x * 10) / 10).toString().replace('.', ',');

// Vorlage als SVG auf Kästchen
export function templateSVG({ cols, rows, cell, ox = 1, oy = 1, wide = [], dash = [], center = null }) {
  const W = cols * cell, H = rows * cell;
  let g = '';
  for (let x = 0; x <= cols; x++) g += `M${x * cell} 0V${H}`;
  for (let y = 0; y <= rows; y++) g += `M0 ${y * cell}H${W}`;
  const P = ([x, y]) => `${(x + ox) * cell},${(y + oy) * cell}`;
  let m = `<rect width="${W}" height="${H}" fill="var(--paper)"/><path d="${g}" stroke="rgba(35,38,43,.13)" stroke-width="1"/>`;
  for (const [a, b] of dash) m += `<path d="M${P(a)}L${P(b)}" stroke="var(--ink)" stroke-width="1.8" stroke-dasharray="8 5"/>`;
  if (center) m += `<path d="M${P(center[0])}L${P(center[1])}" stroke="var(--ink)" stroke-width="1.3" stroke-dasharray="16 4 2 4"/>`;
  for (const poly of wide) m += `<path d="M${poly.map(P).join('L')}Z" fill="none" stroke="var(--ink)" stroke-width="3.2" stroke-linejoin="miter"/>`;
  return svg(m, `0 0 ${W} ${H}`);
}

// opts: { intro, template:{…}, padCols, padRows, cell, styles, expected, factor, factorText, origSize:[w,h], success }
export function gridTask(root, ctx, opts) {
  let checks = 0;
  const cell = opts.cell || 22;
  const tpl = h('div', { class: 'sheet', style: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' } },
    h('div', { class: 'kicker' }, opts.tplTitle || 'Vorlage'),
    templateSVG({ ...opts.template, cell: opts.template.cell || cell }),
    opts.tplNote ? h('div', { class: 'muted', style: { fontSize: '15px' }, html: opts.tplNote }) : '');
  tpl.querySelector('svg').style.cssText = 'width:100%;height:auto;max-height:100%';

  const padHost = h('div', { class: 'pad' });
  const pad = new Pad(padHost, { w: opts.padCols * cell, h: opts.padRows * cell, cell, snap: true, tool: 'line', style: 'wide', gridMajor: 0, onChange: () => pad.setOverlay('') });
  const solBtn = h('button', { class: 'tb', html: icon('eye') + '<span>Hilfe</span>', onclick: showHelp });
  const checkBtn = h('button', { class: 'btn primary', html: icon('check') + 'Prüfen', onclick: check });
  root.append(h('div', { class: 'split left-side' }, tpl,
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '0' } },
      h('div', { class: 'row' }, toolbar(pad, { tools: ['line', 'erase'], styles: opts.styles || ['wide'], extra: [solBtn] }), h('span', { class: 'grow' }), checkBtn),
      padHost)));

  let last = null;
  function check() {
    checks++;
    const d = drawnEdges(pad.strokes, cell);
    const r = compareGrid(d, opts.expected);
    last = r;
    const probs = [];
    if (r.empty) {
      ctx.feedback({ kind: 'bad', title: 'Noch nichts zu prüfen', text: 'Zeichne zuerst den Umriss mit der <b>breiten Volllinie</b>. Nimm das Lineal – die Linien rasten an den Kästchen ein.' });
      return;
    }
    const rel = r.sizeW / opts.origSize[0];
    if (Math.abs(r.scale - 1) > 0.12) {
      probs.push((Math.abs(rel - 1) < 0.1 ? 'Deine Zeichnung ist <b>genauso groß</b> wie die Vorlage.' : `Deine Zeichnung ist etwa <b>${fmt(rel)}-mal so groß</b> wie die Vorlage.`) +
        ` Sie soll aber <b>${opts.factorText}</b> sein. Die Vorlage ist ${opts.origSize[0]} Kästchen breit – deine Zeichnung muss <b>${fmt(opts.origSize[0] * opts.factor)} Kästchen</b> breit sein.`);
    } else {
      if (r.wrongStyle.length) probs.push(`Einige Kanten des Umrisses hast du als <b>${{ thin: 'schmale Volllinie', dash: 'Strichlinie', dashdot: 'Strichpunktlinie' }[r.wrongStyle[0]]}</b> gezeichnet. Sichtbare Kanten zeichnet man mit der <b>breiten Volllinie</b>.`);
      if (r.missing.length || r.extra.length) probs.push(`Am Umriss stimmen noch <b>${r.missing.length + r.extra.length} Kästchen-Stücke</b> nicht. Zähle die Kästchen jeder Kante nach – jede Länge ${opts.factorText === 'doppelt so groß' ? 'mal 2' : 'umrechnen'}!`);
      if (opts.expected.dash && (r.dashMissing.length || r.dashExtra.length)) probs.push('Die <b>unsichtbaren Kanten</b> (Strichlinie) fehlen noch oder liegen falsch. Zähle, wie weit sie vom Rand entfernt sind.');
      if (opts.expected.center && r.centerMissing) probs.push('Die <b>Mittellinie</b> (Strichpunktlinie) fehlt noch oder liegt nicht genau in der Mitte.');
      if (r.thinExtra) probs.push('Du hast schmale Linien gezeichnet, die hier nicht gebraucht werden.');
    }
    if (d.free) probs.push('Tipp: Nur Lineal-Linien werden geprüft.');
    if (!probs.length || (probs.length === 1 && d.free)) {
      const st = checks === 1 ? 3 : checks <= 3 ? 2 : 1;
      if (opts.expected.center && r.centerShort) toast('Tipp: Die Mittellinie ragt in echt ein Stück über das Werkstück hinaus.');
      pad.setOverlay('');
      opts.success(st);
      return;
    }
    ctx.feedback({ kind: 'bad', title: 'Noch nicht ganz', list: probs, actions: checks >= 2 ? [{ label: 'Zeig mir, was fehlt', onClick: showHelp }] : null });
  }

  function showHelp() {
    const r = last && !last.empty && Math.abs(last.scale - 1) <= 0.12 ? last : null;
    if (!r) {
      // Ganze Lösung blass einblenden (oben links)
      const set = new Set(); opts.expected.wide.forEach(p => polyEdges(p, true, set));
      const ox = 1, oy = 1;
      let m = `<path d="${edgesPath([...set], cell, ox, oy)}" stroke="var(--acc)" stroke-width="5" opacity=".35" fill="none" stroke-linecap="round"/>`;
      if (opts.expected.dash) { const ds = new Set(); opts.expected.dash.forEach(([a, b]) => addSeg(ds, a, b)); m += `<path d="${edgesPath([...ds], cell, ox, oy)}" stroke="var(--acc)" stroke-width="3" stroke-dasharray="8 5" opacity=".45" fill="none"/>`; }
      pad.setOverlay(m);
      ctx.feedback({ kind: 'info', title: 'Hilfe', text: 'Die blasse orange Form zeigt dir, wie groß deine Zeichnung werden muss. Zeichne darüber – die Hilfe verschwindet, sobald du weiterzeichnest.' });
      return;
    }
    const [ox, oy] = r.offset;
    let m = '';
    if (r.missing.length) m += `<path d="${edgesPath(r.missing, cell, ox, oy)}" stroke="var(--acc)" stroke-width="6" opacity=".55" fill="none" stroke-linecap="round"/>`;
    if (r.extra.length) m += `<path d="${edgesPath(r.extra, cell, ox, oy)}" stroke="var(--bad)" stroke-width="6" opacity=".35" fill="none" stroke-dasharray="3 5"/>`;
    if (r.dashMissing?.length) m += `<path d="${edgesPath(r.dashMissing, cell, ox, oy)}" stroke="var(--acc)" stroke-width="4" opacity=".5" fill="none" stroke-dasharray="8 5"/>`;
    pad.setOverlay(m);
    ctx.feedback({ kind: 'info', title: 'Hilfe', text: '<b style="color:var(--acc)">Orange</b> = hier fehlt noch eine Linie. <b style="color:var(--bad)">Rot gepunktet</b> = diese Linie ist zu viel (mit dem Radierer entfernen).' });
  }
  return { pad, destroy: () => pad.destroy() };
}
