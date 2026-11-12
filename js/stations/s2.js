import { h, svg } from '../ui.js';
import { techDrawing } from '../drawings.js';
import { labeling } from '../label.js';

const RULES = [
  ['kante', 'Werkstückkante', 'Die sichtbaren Kanten des Werkstücks. Sie werden immer <b>breit</b> (dick) gezeichnet.'],
  ['hilfs', 'Maßhilfslinie', 'Verlängert eine Werkstückkante nach außen. Die Maße stehen meist <b>außerhalb</b> des Werkstücks.'],
  ['linie', 'Maßlinie', 'Liegt zwischen zwei Maßhilfslinien, parallel zur bemaßten Kante – <b>10 mm</b> von der Kante entfernt, jede weitere <b>7 mm</b> weiter.'],
  ['pfeil', 'Maßpfeil', 'Sitzt an den Enden der Maßlinie und zeigt auf die Maßhilfslinie. Die Spitze wird <b>ausgemalt</b>.'],
  ['zahl', 'Maßzahl', 'Steht in der <b>Mitte über</b> der Maßlinie, in Normschrift. Angabe in Millimetern – „mm“ schreibt man nicht dazu.'],
  ['dicke', 'Werkstückdicke', 'Wird <b>in</b> das Werkstück geschrieben, mit einem kleinen <b>t</b> – zum Beispiel t=2 (in mm).'],
];

const SLOTS = [
  { id: 'kante', x: 18, y: 206, w: 150, lead: [247, 212], answer: 'kante', desc: 'eine dick gezeichnete Kante des Werkstücks' },
  { id: 'dicke', x: 18, y: 286, w: 150, lead: [242, 296], answer: 'dicke', desc: 'die Angabe „t=2“ im Werkstück' },
  { id: 'hilfs', x: 430, y: 30, w: 150, lead: [380, 140], answer: 'hilfs', desc: 'eine dünne Linie, die eine Werkstückkante nach außen verlängert' },
  { id: 'pfeil', x: 530, y: 96, w: 150, lead: [560, 188], answer: 'pfeil', desc: 'die ausgemalte Spitze am Ende einer Maßlinie' },
  { id: 'linie', x: 40, y: 420, w: 150, lead: [250, 386], answer: 'linie', desc: 'die dünne Linie mit Pfeilen zwischen zwei Maßhilfslinien' },
  { id: 'zahl', x: 330, y: 420, w: 150, lead: [318, 362], answer: 'zahl', desc: 'die Zahl 51' },
];

export default {
  id: 2, title: 'Die Maßangaben', tag: 'Beschriften', min: 10,
  icon: '<rect x="8" y="26" width="32" height="12"/><path d="M8 24V10M40 24V10M8 15h32"/><path d="M8 15l6-3v6zM40 15l-6-3v6z" fill="currentColor"/>',
  render(root, ctx) {
    learn();

    function learn() {
      ctx.steps(2, 0);
      root.innerHTML = '';
      root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, 'Lernen'),
        h('span', {}, 'Mit einer Technischen Zeichnung kann man ein Werkstück herstellen – dafür braucht man alle Maße und ein paar Fachbegriffe. ', h('b', {}, 'Tippe die Begriffe an'), ' und schau, was in der Zeichnung aufleuchtet.')));
      const pic = svg(techDrawing(), '0 60 690 380');
      const ruleEls = RULES.map(([id, name, text], k) => h('button', { class: 'rule', onclick: () => light(id) },
        h('span', { class: 'n' }, String(k + 1)), h('span', {}, h('span', { class: 'rn' }, name), h('span', { html: text }))));
      const light = id => {
        pic.querySelectorAll('.hlg').forEach(g => g.classList.toggle('on', g.dataset.part === id));
        ruleEls.forEach((r, k) => r.classList.toggle('on', RULES[k][0] === id));
      };
      root.append(h('div', { class: 'split wide-side' },
        h('div', { class: 'sheet' }, pic),
        h('div', { class: 'side' }, h('div', { class: 'rules' }, ruleEls),
          h('button', { class: 'btn primary', onclick: task, html: 'Zur Aufgabe <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' }))));
      light('kante');
    }

    function task() {
      ctx.steps(2, 1);
      root.innerHTML = '';
      root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, 'Aufgabe'),
        h('span', {}, 'Ziehe die Fachbegriffe an die richtige Stelle der Technischen Zeichnung.'),
        h('button', { class: 'btn small flat', style: { marginLeft: 'auto' }, onclick: learn }, 'Nochmal lernen')));
      const left = h('div', { style: { display: 'flex', minHeight: '0' } });
      const side = h('div', { class: 'side' });
      const split = h('div', { class: 'split' }, left, side);
      root.append(split);
      const { sheet } = labeling(left, side, ctx, {
        drawing: techDrawing({ parts: false }), viewBox: '0 10 700 465', slots: SLOTS,
        chips: RULES.map(([id, label, rule]) => ({ id, label, rule })),
        onDone: m => ctx.complete(m === 0 ? 3 : m <= 2 ? 2 : 1, 'Alle sechs Fachbegriffe sitzen. Jetzt weißt du, woraus eine Bemaßung besteht!'),
      });
      sheet.style.flex = '1';
    }
  },
};
