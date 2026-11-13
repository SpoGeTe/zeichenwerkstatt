import { h } from '../ui.js';
import { arrow } from '../drawings.js';
import { labeling } from '../label.js';

// Schaubild: Rechteck mit verdeckten Kanten, Mittellinie und Maß 23
const DRAW = `
  <path class="wp" d="M250,190H530V400H250Z"/>
  <path d="M262,252H520M262,338H520" stroke="var(--ink)" stroke-width="2.2" stroke-dasharray="14 8" fill="none"/>
  <path d="M215,295H570" stroke="var(--ink)" stroke-width="1.3" stroke-dasharray="26 6 3 6" fill="none"/>
  <path class="thin" d="M244,190H190M244,400H190M200,190V400"/>
  ${arrow(200, 190, 'u')}${arrow(200, 400, 'd')}
  <text class="dim" transform="translate(194,305) rotate(-90)" style="font-size:18px">23</text>`;

const PAIRS = [
  { k: 'tl', x: 20, y: 40, lead: [200, 240], line: 'schmal', use: 'bemass', desc: 'die dünne Maßlinie mit den Pfeilen', easy: 'eine <b>dünne, durchgehende</b> Linie mit Pfeilen. Sie gehört zum Maß 23' },
  { k: 'tr', x: 470, y: 40, lead: [440, 252], line: 'strich', use: 'unsicht', desc: 'eine gestrichelte Linie im Werkstück', easy: 'eine Linie aus <b>kurzen Strichen mit Lücken</b>' },
  { k: 'bl', x: 20, y: 455, lead: [300, 295], line: 'punkt', use: 'mitte', desc: 'die Linie aus langen Strichen und Punkten in der Mitte', easy: 'die Linie <b>genau in der Mitte</b>: langer Strich – Punkt – langer Strich' },
  { k: 'br', x: 470, y: 455, lead: [470, 400], line: 'breit', use: 'sicht', desc: 'den dicken Rand des Werkstücks', easy: 'den <b>dicken Rand</b> des Teils' },
];
const CHIPS = [
  { id: 'strich', label: 'Strichlinie', rule: 'Viele kurze Striche mit Lücken – für Kanten, die man <b>nicht sehen</b> kann.', easy: 'Striche mit Lücken: – – – –' },
  { id: 'breit', label: 'breite Volllinie', rule: 'Dick und durchgehend – für alle <b>sichtbaren</b> Kanten.', easy: 'eine <b>dicke</b> Linie ohne Lücken.' },
  { id: 'schmal', label: 'schmale Volllinie', rule: 'Dünn und durchgehend – für Maßlinien und Maßhilfslinien.', easy: 'eine <b>dünne</b> Linie ohne Lücken.' },
  { id: 'punkt', label: 'Strichpunktlinie', rule: 'Langer Strich, Punkt, langer Strich – sie zeigt die <b>Mitte</b> eines Werkstücks.', easy: 'Strich, Punkt, Strich, Punkt: — · — · —' },
  { id: 'unsicht', label: 'unsichtbare Kante', rule: 'Kanten, die im Inneren oder hinten liegen, zeichnet man mit der <b>Strichlinie</b>.', easy: 'eine Kante, die man <b>nicht sehen</b> kann, weil sie innen oder hinten liegt. Dafür nimmt man Striche mit Lücken.' },
  { id: 'sicht', label: 'sichtbare Kante', rule: 'Was man von außen sieht, wird mit der <b>breiten Volllinie</b> gezeichnet.', easy: 'eine Kante, die man <b>sehen</b> kann. Dafür nimmt man eine dicke Linie.' },
  { id: 'bemass', label: 'Bemaßungslinie', rule: 'Maße zeichnet man mit der <b>schmalen Volllinie</b>.', easy: 'eine Linie, die zeigt, <b>wie lang</b> etwas ist. Dafür nimmt man eine dünne Linie.' },
  { id: 'mitte', label: 'Mittellinie', rule: 'Die Mitte zeigt man mit der <b>Strichpunktlinie</b>.', easy: 'eine Linie, die die <b>Mitte</b> zeigt. Dafür nimmt man Strich – Punkt – Strich.' },
];

export default {
  id: 4, title: 'Linien im Schaubild', tag: 'Zuordnen', min: 10,
  icon: '<rect x="9" y="10" width="30" height="28" stroke-width="3"/><path d="M11 19h26M11 29h26" stroke-dasharray="4 3"/><path d="M3 24h42" stroke-dasharray="8 3 2 3" stroke-width="1.2"/>',
  render(root, ctx) {
    ctx.steps(1, 0);
    root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, 'Aufgabe'),
      h('span', {}, 'Beschrifte das Schaubild: Ziehe in jeden Kasten ', h('b', {}, 'oben die Bezeichnung'), ' der Linie und ', h('b', {}, 'unten ihre Verwendung'), '.')));
    const slots = [];
    let labels = '';
    for (const p of PAIRS) {
      slots.push({ id: p.k + '1', x: p.x, y: p.y, w: 190, lead: p.y > 300 ? p.lead : null, answer: p.line, desc: p.desc, easy: p.easy });
      slots.push({ id: p.k + '2', x: p.x, y: p.y + 46, w: 190, lead: p.y > 300 ? null : p.lead, answer: p.use, desc: p.desc, easy: p.easy });
      labels += `<rect x="${p.x - 8}" y="${p.y - 8}" width="206" height="102" rx="12" fill="none" stroke="var(--soft)" stroke-width="1.5"/>`;
    }
    const left = h('div', { style: { display: 'flex', minHeight: '0' } });
    const side = h('div', { class: 'side' });
    root.append(h('div', { class: 'split' }, left, side));
    const { sheet } = labeling(left, side, ctx, {
      drawing: labels + DRAW, viewBox: '0 20 680 560', slots, chips: CHIPS,
      onDone: m => ctx.complete(m === 0 ? 3 : m <= 3 ? 2 : 1, 'Bezeichnung und Verwendung passen zusammen. Damit kannst du jede Technische Zeichnung „lesen“.'),
    });
    sheet.style.flex = '1';
  },
};
