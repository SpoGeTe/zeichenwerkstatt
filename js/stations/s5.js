import { h } from '../ui.js';
import { gridTask } from '../gridtask.js';
import { scalePts } from '../geom.js';

// Werkstück aus Blatt 5 (in Kästchen)
const SHAPE = [[0, 0], [4, 0], [4, 7], [6, 7], [6, 9], [5, 9], [5, 11], [0, 11]];
const DASH = [[[1, 0], [1, 11]], [[3, 0], [3, 11]]];
const CENTER = [[2, -1], [2, 12]];

export default {
  id: 5, title: 'Doppelt so groß', tag: 'Zeichnen', min: 15,
  icon: '<path d="M4 8h40M4 18h40M4 28h40M4 38h40M8 4v40M18 4v40M28 4v40M38 4v40" stroke-width=".7" opacity=".45"/><path d="M8 8h10v20H8z"/><path d="M22 18h8v6h4v14H22z" stroke-width="2.6"/>',
  render(root, ctx) {
    ctx.steps(1, 0);
    root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, 'Aufgabe'),
      h('span', {}, 'Manchmal ist ein Werkstück so klein, dass man es ', h('b', {}, 'vergrößert'), ' zeichnet. Zeichne das Werkstück ', h('b', {}, 'doppelt so groß'),
        ' ab – mit Umriss (breit), unsichtbaren Kanten (Strich) und Mittellinie (Strich-Punkt). Die Kästchen helfen dir.')));
    const t = gridTask(root, ctx, {
      template: { cols: 8, rows: 14, ox: 1, oy: 1.5, wide: [SHAPE], dash: DASH, center: CENTER },
      tplNote: 'Breite: 4 Kästchen (unten 6)<br>Höhe: 11 Kästchen',
      padCols: 15, padRows: 26, cell: 22,
      styles: ['wide', 'dash', 'dashdot'],
      expected: {
        wide: [scalePts(SHAPE, 2)],
        dash: DASH.map(l => scalePts(l, 2)),
        center: { a: [4, 0], b: [4, 22], vertical: true, over: 4 },
      },
      factor: 2, factorText: 'doppelt so groß', origSize: [6, 11],
      success: st => ctx.complete(st, 'Perfekt vergrößert! Jede Strecke ist jetzt doppelt so lang – das nennt man <b>Maßstab 2:1</b>.'),
    });
    return t.destroy;
  },
};
