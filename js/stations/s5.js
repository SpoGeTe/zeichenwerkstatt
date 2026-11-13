import { h } from '../ui.js';
import { gridTask } from '../gridtask.js';
import { scalePts } from '../geom.js';

// Werkstück nach Blatt 5 (in Kästchen) – so klein, dass die doppelte Größe gut aufs iPad passt
const SHAPE = [[0, 0], [4, 0], [4, 4], [5, 4], [5, 6], [4, 6], [4, 7], [0, 7]];
const DASH = [[[1, 0], [1, 7]], [[3, 0], [3, 7]]];
const CENTER = [[2, -1], [2, 8]];

export default {
  id: 5, title: 'Doppelt so groß', tag: 'Zeichnen', min: 15,
  icon: '<path d="M4 8h40M4 18h40M4 28h40M4 38h40M8 4v40M18 4v40M28 4v40M38 4v40" stroke-width=".7" opacity=".45"/><path d="M8 8h10v20H8z"/><path d="M22 18h8v6h4v14H22z" stroke-width="2.6"/>',
  render(root, ctx) {
    ctx.steps(1, 0);
    root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, 'Aufgabe'),
      h('span', {}, 'Manchmal ist ein Werkstück so klein, dass man es ', h('b', {}, 'vergrößert'), ' zeichnet. Zeichne das Werkstück rechts ', h('b', {}, 'doppelt so groß'),
        ' ab – mit Umriss (breit), unsichtbaren Kanten (Strich) und Mittellinie (Strich-Punkt). Zähl die Kästchen: Jede Strecke wird ', h('b', {}, 'doppelt so lang'), '.')));
    const t = gridTask(root, ctx, {
      template: { wide: [SHAPE], dash: DASH, center: CENTER, ext: [0, -1, 5, 8] },
      tplCols: 7, drawCols: 14, rows: 20, cell: 30,
      tplTitle: 'Vorlage', drawTitle: 'Deine Zeichnung · doppelt so groß',
      styles: ['wide', 'dash', 'dashdot'],
      expected: {
        wide: [scalePts(SHAPE, 2)],
        dash: DASH.map(l => scalePts(l, 2)),
        center: { a: [4, 0], b: [4, 14], vertical: true, over: 4 },
      },
      factor: 2, factorText: 'doppelt so groß', origSize: [5, 7],
      ruleShort: 'jede Länge mal 2',
      ruleEasy: 'Doppelt so groß heißt: Aus <b>1</b> Kästchen werden <b>2</b>, aus <b>4</b> werden <b>8</b>.',
      success: st => ctx.complete(st, 'Perfekt vergrößert! Jede Strecke ist jetzt doppelt so lang – das nennt man <b>Maßstab 2:1</b>.'),
    });
    return t.destroy;
  },
};
