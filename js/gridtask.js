// Zeichenaufgabe auf Kästchenpapier mit automatischer Prüfung.
// Vorlage (links) und eigene Zeichnung (rechts) liegen auf DEMSELBEN Kästchenpapier –
// die Kästchen sind also überall gleich groß.
import { h, icon, toast } from './ui.js';
import { Pad, toolbar } from './pad.js';
import { drawnEdges, compareGrid, edgesPath, polyEdges, addSeg } from './geom.js';

const fmt = x => (Math.round(x * 10) / 10).toString().replace('.', ',');

/* opts:
   template: { wide:[poly], dash:[[a,b]], center:[a,b], ext:[x0,y0,x1,y1] }  (Kästchen)
   tplCols, drawCols, rows, cell
   tplTitle, drawTitle, styles
   expected: { wide, dash, center }, factor, factorText, ruleEasy, origSize:[w,h]
   success(stars) */
export function gridTask(root, ctx, opts) {
  let checks = 0;
  const cell = opts.cell || 30;
  const { tplCols, drawCols, rows } = opts;
  const W = (tplCols + drawCols) * cell, H = rows * cell;
  const zoneX = tplCols * cell;              // ab hier beginnt „Deine Zeichnung“
  const t = opts.template;
  const [ex0, ey0, ex1, ey1] = t.ext;
  // Vorlage mittig in ihr Feld setzen (ganze Kästchen, damit sie auf dem Raster liegt)
  const tox = Math.floor((tplCols - (ex1 - ex0)) / 2) - ex0;
  const toy = 1 + Math.floor((rows - 1 - (ey1 - ey0)) / 2) - ey0;
  const P = ([x, y]) => `${(x + tox) * cell},${(y + toy) * cell}`;

  let bg = `<rect x="0" y="0" width="${zoneX}" height="${H}" fill="rgba(35,38,43,.035)"/>`;
  for (const [a, b] of t.dash || []) bg += `<path d="M${P(a)}L${P(b)}" stroke="var(--ink)" stroke-width="1.8" stroke-dasharray="8 5"/>`;
  if (t.center) bg += `<path d="M${P(t.center[0])}L${P(t.center[1])}" stroke="var(--ink)" stroke-width="1.3" stroke-dasharray="16 4 2 4"/>`;
  for (const poly of t.wide) bg += `<path d="M${poly.map(P).join('L')}Z" fill="none" stroke="var(--ink)" stroke-width="3.2" stroke-linejoin="miter"/>`;
  bg += `<path d="M${zoneX} 0V${H}" stroke="var(--ink)" stroke-width="3"/>`;
  const label = (x, w, text) => `<rect x="${x + 4}" y="4" width="${w - 8}" height="${cell - 8}" fill="var(--paper)"/>` +
    `<text x="${x + 10}" y="${cell / 2 + 6}" font-family="Barlow Condensed" font-weight="700" font-size="${Math.min(18, cell * 0.6)}" letter-spacing=".5" fill="var(--ink)">${text}</text>`;
  bg += label(0, zoneX, (opts.tplTitle || 'VORLAGE').toUpperCase());
  bg += label(zoneX, drawCols * cell, (opts.drawTitle || 'DEINE ZEICHNUNG').toUpperCase());

  const padHost = h('div', { class: 'pad' });
  const pad = new Pad(padHost, { w: W, h: H, cell, snap: true, tool: 'line', style: 'wide', bg, onChange: () => pad.setOverlay('') });
  const solBtn = h('button', { class: 'tb', html: icon('eye') + '<span>Hilfe</span>', onclick: showHelp });
  const checkBtn = h('button', { class: 'btn primary', html: icon('check') + 'Prüfen', onclick: check });
  root.append(h('div', { class: 'row' }, toolbar(pad, { tools: ['line', 'erase'], styles: opts.styles || ['wide'], extra: [solBtn] }), h('span', { class: 'grow' }), checkBtn), padHost);

  const inZone = s => s.pts.every(p => p.x >= zoneX - 1);
  let last = null;

  function check() {
    checks++;
    const mine = pad.strokes.filter(inZone);
    const inTpl = pad.strokes.length - mine.length;
    const d = drawnEdges(mine, cell);
    const r = compareGrid(d, opts.expected);
    last = r;
    const probs = [];
    if (inTpl) probs.push(['Tipp: Du hast in die <b>Vorlage</b> gezeichnet. Gezählt wird nur, was rechts unter „Deine Zeichnung“ steht.',
      'Tipp: Ein paar Linien sind <b>links in der Vorlage</b>. Zeichne <b>rechts</b> im Feld „Deine Zeichnung“. Die linken Striche kannst du mit dem Radierer wegmachen.']);
    if (r.empty) {
      ctx.feedback({ kind: 'bad', title: 'Noch nichts zu prüfen',
        text: 'Zeichne zuerst den Umriss mit der <b>breiten Volllinie</b>. Nimm das Lineal – die Linien rasten an den Kästchen ein.',
        easy: 'Fang mit dem <b>Rand</b> an: Tippe oben auf <b>„Lineal“</b> und <b>„breit“</b>. Dann zieh eine Linie von Ecke zu Ecke – sie springt von selbst auf die Kästchen.',
        list: probs });
      return;
    }
    const rel = r.sizeW / opts.origSize[0];
    const [ow] = opts.origSize, want = ow * opts.factor;
    if (Math.abs(r.scale - 1) > 0.12) {
      probs.push([(Math.abs(rel - 1) < 0.1 ? 'Deine Zeichnung ist <b>genauso groß</b> wie die Vorlage.' : `Deine Zeichnung ist etwa <b>${fmt(rel)}-mal so groß</b> wie die Vorlage.`) +
        ` Sie soll aber <b>${opts.factorText}</b> sein. Die Vorlage ist ${ow} Kästchen breit – deine Zeichnung muss <b>${fmt(want)} Kästchen</b> breit sein.`,
        `Zähl die Kästchen! Die Vorlage ist <b>${ow}</b> Kästchen breit. ${opts.ruleEasy} Deine Zeichnung muss also <b>${fmt(want)}</b> Kästchen breit sein – gerade ist sie <b>${fmt(r.sizeW)}</b> Kästchen breit.`]);
    } else {
      if (r.wrongStyle.length) probs.push([`Einige Kanten des Umrisses hast du als <b>${{ thin: 'schmale Volllinie', dash: 'Strichlinie', dashdot: 'Strichpunktlinie' }[r.wrongStyle[0]]}</b> gezeichnet. Sichtbare Kanten zeichnet man mit der <b>breiten Volllinie</b>.`,
        'Der <b>Rand</b> vom Teil muss eine <b>dicke</b> Linie ohne Lücken sein. Tippe oben auf <b>„breit“</b> und zeichne die Kante nochmal.']);
      if (r.missing.length || r.extra.length) probs.push([`Am Umriss stimmen noch <b>${r.missing.length + r.extra.length} Kästchen-Stücke</b> nicht. Zähle die Kästchen jeder Kante nach – ${opts.ruleShort}!`,
        `Ein paar Linien am Rand stimmen noch nicht. Geh <b>Kante für Kante</b> vor: Zähl in der Vorlage die Kästchen. ${opts.ruleEasy} Tipp: Der Knopf <b>„Hilfe“</b> zeigt dir, wo etwas fehlt.`]);
      if (opts.expected.dash && (r.dashMissing.length || r.dashExtra.length)) probs.push(['Die <b>unsichtbaren Kanten</b> (Strichlinie) fehlen noch oder liegen falsch. Zähle, wie weit sie vom Rand entfernt sind.',
        'Die <b>gestrichelten</b> Linien fehlen oder sind falsch. Zähl in der Vorlage, wie viele Kästchen sie vom <b>linken Rand</b> weg sind – und nimm das <b>doppelt</b>. Wähle oben „Strich“.']);
      if (opts.expected.center && r.centerMissing) probs.push(['Die <b>Mittellinie</b> (Strichpunktlinie) fehlt noch oder liegt nicht genau in der Mitte.',
        'Es fehlt die Linie <b>genau in der Mitte</b> (oben „Strich-Punkt“ wählen). Sie geht von oben nach unten und steht oben und unten ein Stück über das Teil hinaus.']);
      if (r.thinExtra) probs.push(['Du hast schmale Linien gezeichnet, die hier nicht gebraucht werden.', 'Da sind <b>dünne</b> Linien, die nicht hingehören. Mach sie mit dem <b>Radierer</b> weg.']);
    }
    if (d.free) probs.push(['Tipp: Nur Lineal-Linien werden geprüft.', 'Tipp: Zeichne mit dem <b>Lineal</b>-Werkzeug.']);
    const real = probs.filter(([n]) => !n.startsWith('Tipp'));
    if (!real.length) {
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
      // Ganze Lösung blass ins Zeichenfeld legen
      const set = new Set(); opts.expected.wide.forEach(p => polyEdges(p, true, set));
      const ox = tplCols + 2 - Math.min(0, ...opts.expected.wide.flat().map(p => p[0]));
      const oy = 2 - Math.min(0, ...opts.expected.wide.flat().map(p => p[1])) + (opts.expected.center ? 1 : 0);
      let m = `<path d="${edgesPath([...set], cell, ox, oy)}" stroke="var(--acc)" stroke-width="5" opacity=".35" fill="none" stroke-linecap="round"/>`;
      if (opts.expected.dash) { const ds = new Set(); opts.expected.dash.forEach(([a, b]) => addSeg(ds, a, b)); m += `<path d="${edgesPath([...ds], cell, ox, oy)}" stroke="var(--acc)" stroke-width="3" stroke-dasharray="8 5" opacity=".45" fill="none"/>`; }
      pad.setOverlay(m);
      ctx.feedback({ kind: 'info', title: 'Hilfe', text: 'Die blasse orange Form zeigt dir, wie groß deine Zeichnung werden muss. Zeichne darüber – die Hilfe verschwindet, sobald du weiterzeichnest.',
        easy: 'Die <b>orange</b> Form ist eine Vorlage zum Nachfahren. Zieh mit dem Lineal genau über die orangen Linien.' });
      return;
    }
    const [ox, oy] = r.offset;
    let m = '';
    if (r.missing.length) m += `<path d="${edgesPath(r.missing, cell, ox, oy)}" stroke="var(--acc)" stroke-width="6" opacity=".55" fill="none" stroke-linecap="round"/>`;
    if (r.extra.length) m += `<path d="${edgesPath(r.extra, cell, ox, oy)}" stroke="var(--bad)" stroke-width="6" opacity=".35" fill="none" stroke-dasharray="3 5"/>`;
    if (r.dashMissing?.length) m += `<path d="${edgesPath(r.dashMissing, cell, ox, oy)}" stroke="var(--acc)" stroke-width="4" opacity=".5" fill="none" stroke-dasharray="8 5"/>`;
    pad.setOverlay(m);
    ctx.feedback({ kind: 'info', title: 'Hilfe', text: '<b style="color:var(--acc)">Orange</b> = hier fehlt noch eine Linie. <b style="color:var(--bad)">Rot gepunktet</b> = diese Linie ist zu viel (mit dem Radierer entfernen).',
      easy: 'Zieh eine Linie über alles, was <b>orange</b> ist. Was <b>rot gepunktet</b> ist, wischst du mit dem <b>Radierer</b> weg.' });
  }
  return { pad, destroy: () => pad.destroy() };
}
