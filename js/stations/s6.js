import { h } from '../ui.js';
import { gridTask } from '../gridtask.js';
import { scalePts } from '../geom.js';

const QUIZ = [
  ['Maßstab <b>1:10</b> – 1 cm in der Zeichnung sind in Wirklichkeit …', ['1 mm', '1 cm', '10 cm', '100 cm'], 2,
    'Die erste Zahl steht für die Zeichnung, die zweite für die Wirklichkeit: 1 cm gezeichnet = 10 cm echt. Die Zeichnung ist also <b>verkleinert</b>.'],
  ['Maßstab <b>10:1</b> – 10 cm in der Zeichnung sind in Wirklichkeit …', ['1 cm', '10 cm', '100 cm'], 0,
    '10 cm gezeichnet = 1 cm echt. Die Zeichnung ist <b>vergrößert</b> – zehnmal so groß wie das Bauteil.'],
  ['Eine <b>Autotür</b> zeichnet man am besten im Maßstab …', ['1:10', '1:1', '5:1'], 0,
    'Eine Autotür passt nicht aufs Blatt. Man zeichnet sie <b>verkleinert</b>, z. B. 1:10.'],
  ['Eine <b>winzige Schraube</b> zeichnet man am besten im Maßstab …', ['1:5', '1:1', '5:1'], 2,
    'Kleine Teile zeichnet man <b>vergrößert</b> (z. B. 5:1), damit man Form und Maße gut erkennt.'],
  ['Was bedeutet der Maßstab <b>1:1</b>?', ['Die Zeichnung ist so groß wie das echte Bauteil.', 'Die Zeichnung ist doppelt so groß.', 'Die Zeichnung ist halb so groß.'], 0,
    '1:1 heißt „natürliche Größe“: 1 cm in der Zeichnung = 1 cm in echt.'],
];

const TASKS = [
  // Größen so gewählt, dass Vorlage und Lösung nebeneinander aufs gleiche Kästchenpapier passen
  { shape: [[0, 1], [1, 0], [3, 0], [3, 3], [0, 3]], from: '1:2', to: '1:1', factor: 2, factorText: 'doppelt so groß', size: [3, 3],
    ruleShort: 'jede Länge mal 2', ruleEasy: 'Von 1:2 auf 1:1 heißt: <b>doppelt so groß</b>. Aus <b>1</b> Kästchen werden <b>2</b>, aus <b>3</b> werden <b>6</b>.',
    note: 'Die Vorlage ist im Maßstab <b>1:2</b> gezeichnet – also <b>halb so groß</b> wie das echte Bauteil. Zeichne es rechts im Maßstab <b>1:1</b> (echte Größe).' },
  { shape: [[0, 0], [8, 0], [8, 4], [4, 6], [0, 4]], from: '1:1', to: '1:2', factor: 0.5, factorText: 'halb so groß', size: [8, 6],
    ruleShort: 'jede Länge durch 2', ruleEasy: 'Von 1:1 auf 1:2 heißt: <b>halb so groß</b>. Aus <b>8</b> Kästchen werden <b>4</b>, aus <b>4</b> werden <b>2</b>.',
    note: 'Die Vorlage ist im Maßstab <b>1:1</b> gezeichnet – so groß wie in echt. Zeichne das Bauteil rechts im Maßstab <b>1:2</b>.' },
  { shape: [[0, 0], [6, 0], [6, 3], [3, 3], [3, 6], [0, 6]], from: '3:1', to: '1:1', factor: 1 / 3, factorText: 'ein Drittel so groß', size: [6, 6],
    ruleShort: 'jede Länge durch 3', ruleEasy: 'Von 3:1 auf 1:1 heißt: <b>dreimal kleiner</b>. Aus <b>6</b> Kästchen werden <b>2</b>, aus <b>3</b> wird <b>1</b>.',
    note: 'Die Vorlage ist im Maßstab <b>3:1</b> gezeichnet – also <b>dreimal so groß</b> wie in echt. Zeichne das Bauteil rechts im Maßstab <b>1:1</b>.' },
];

export default {
  id: 6, title: 'Der Maßstab', tag: 'Rechnen & Zeichnen', min: 20,
  icon: '<rect x="5" y="22" width="12" height="12"/><rect x="22" y="10" width="22" height="24" stroke-width="2.6"/><path d="M5 42h39" stroke-width="1.2"/>',
  render(root, ctx) {
    const total = 1 + TASKS.length;
    let wrong = 0, starsSum = 0, cleanup = null;
    quiz(0);

    function quiz(i) {
      ctx.steps(total, 0);
      root.innerHTML = '';
      const [q, opts, right, expl] = QUIZ[i];
      const box = h('div', { class: 'quiz' });
      root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, 'Lernen'),
        h('span', {}, 'Ein ', h('b', {}, 'Maßstab'), ' gibt an, wie groß die Zeichnung im Vergleich zum echten Bauteil ist. ', h('span', { class: 'muted' }, `Frage ${i + 1} von ${QUIZ.length}`))), box);
      let answered = false;
      const btns = opts.map((o, k) => h('button', { class: 'opt', onclick: () => {
        if (answered) return;
        if (k === right) {
          answered = true; btns[k].classList.add('ok');
          box.append(h('div', { class: 'expl', html: expl }),
            h('button', { class: 'btn primary', onclick: () => (i + 1 < QUIZ.length ? quiz(i + 1) : task(0)) }, i + 1 < QUIZ.length ? 'Nächste Frage' : 'Jetzt selbst zeichnen'));
          ctx.hideFeedback();
        } else {
          wrong++; btns[k].classList.add('bad');
          ctx.feedback({ kind: 'bad', title: 'Nicht ganz', text: 'Tipp: <b>Erste Zahl = Zeichnung</b>, zweite Zahl = Wirklichkeit. Ist die erste Zahl größer, ist die Zeichnung vergrößert.',
            easy: 'Lies den Maßstab wie einen Satz: <b>1:10</b> heißt „<b>1</b> cm auf dem Papier sind <b>10</b> cm in echt“. Die <b>erste</b> Zahl gehört immer zum <b>Papier</b>, die <b>zweite</b> zum <b>echten Teil</b>.' });
        }
      } }, o));
      box.append(h('div', { class: 'q', html: q }), h('div', { class: 'opts' }, btns));
    }

    function task(i) {
      if (cleanup) cleanup();
      ctx.steps(total, i + 1);
      ctx.hideFeedback();
      root.innerHTML = '';
      const t = TASKS[i];
      const target = scalePts(t.shape, t.factor);
      root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, `Bauteil ${i + 1}/3`), h('span', { html: t.note })));
      const g = gridTask(root, ctx, {
        tplTitle: `Vorlage · Maßstab ${t.from}`,
        drawTitle: `Deine Zeichnung · Maßstab ${t.to}`,
        template: { wide: [t.shape], ext: [0, 0, t.size[0], t.size[1]] },
        tplCols: 10, drawCols: 10, rows: 10, cell: 40,
        styles: ['wide'],
        expected: { wide: [target] },
        factor: t.factor, factorText: t.factorText, origSize: t.size, ruleShort: t.ruleShort, ruleEasy: t.ruleEasy,
        success: st => {
          starsSum += st;
          if (i + 1 < TASKS.length) {
            ctx.feedback({ kind: 'ok', title: 'Richtig!', text: `Genau – im Maßstab ${t.to} ist das Bauteil ${t.factorText} wie die Vorlage.`, actions: [{ label: 'Nächstes Bauteil', cls: 'primary', onClick: () => task(i + 1) }] });
          } else {
            const avg = Math.round(starsSum / TASKS.length - (wrong > 2 ? 1 : 0));
            ctx.complete(Math.max(1, Math.min(3, avg)), 'Du kannst Bauteile in jedem Maßstab zeichnen. Merke: <b>erste Zahl = Zeichnung, zweite Zahl = Wirklichkeit</b>.');
          }
        },
      });
      cleanup = g.destroy;
    }
    return () => cleanup && cleanup();
  },
};
