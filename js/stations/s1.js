import { h, svg, shuffle, shake, dnd } from '../ui.js';
import { techDrawing, sketchDrawing } from '../drawings.js';

const CARDS = [
  ['Wird frei aus der Hand gezeichnet.', 'S', 'Für eine Skizze braucht man meist kein Lineal – man zeichnet sie einfach frei aus der Hand.'],
  ['Wird mit Lineal und Geodreieck gezeichnet.', 'T', 'Bei der Technischen Zeichnung müssen die Linien ganz gerade sein – deshalb braucht man ein Lineal.'],
  ['Die Linien dürfen etwas krumm sein.', 'S', 'Bei einer Skizze müssen die Linien nicht ganz gerade sein.'],
  ['Muss ganz genau sein.', 'T', 'Nach einer Technischen Zeichnung wird gebaut – deshalb muss sie ganz genau sein.'],
  ['Ist schnell gemacht – gut, um eine Idee festzuhalten.', 'S', 'Hat man eine Idee, kann man sie mit einer Skizze schnell aufs Papier bringen.'],
  ['Braucht deutlich mehr Zeit.', 'T', 'Eine Technische Zeichnung ist viel aufwendiger als eine Skizze.'],
  ['Enthält alle nötigen Maße.', 'T', 'Nur wenn alle Maße angegeben sind, kann man das Werkstück herstellen.'],
  ['Nicht alle Maße müssen angegeben sein.', 'S', 'Bei der Skizze reichen die wichtigsten Maße.'],
  ['Details dürfen weggelassen oder vereinfacht werden.', 'S', 'Eine Skizze muss nicht vollständig sein.'],
  ['Enthält Material und alle Details zum Bauteil.', 'T', 'In der Technischen Zeichnung steht alles, was man zum Bauen wissen muss – auch das Material.'],
  ['Wird in Normschrift beschriftet.', 'T', 'Für Technische Zeichnungen gibt es eine bestimmte Schrift: die Normschrift. So kann sie jeder lesen.'],
  ['Danach kann man ein Werkstück fertigen oder zusammenbauen.', 'T', 'Genau dafür ist die Technische Zeichnung da: als genaue Beschreibung zum Herstellen.'],
  ['Die angegebenen Maße müssen stimmen.', 'B', 'Bei beiden gilt: Wenn ein Maß angegeben wird, muss es korrekt sein – auch bei der Skizze.'],
];
const BIN = { S: 'Skizze', B: 'Beide', T: 'Technische Zeichnung' };

export default {
  id: 1, title: 'Skizze oder Zeichnung?', tag: 'Sortieren', min: 10,
  icon: '<path d="M6 22c5-7 9 3 14-3s9 1 13-5"/><path d="M6 36h36"/><path d="M6 36v-3M42 36v-3"/>',
  render(root, ctx) {
    const deck = shuffle(CARDS);
    let i = 0, mistakes = 0;
    const sorted = { S: [], B: [], T: [] };
    ctx.steps(deck.length, 0);

    root.append(h('div', { class: 'task' }, h('span', { class: 'lbl' }, 'Aufgabe'),
      h('span', {}, 'Ein Werkstück kann man als ', h('b', {}, 'Skizze'), ' oder als ', h('b', {}, 'Technische Zeichnung'), ' darstellen. Ziehe jede Karte in den passenden Kasten – oder tippe erst die Karte und dann den Kasten an.')));

    const fig = (title, markup) => h('figure', {}, h('figcaption', {}, title), svg(markup, '170 100 420 300'));
    const duo = h('div', { class: 'duo' }, fig('Skizze', sketchDrawing()), fig('Technische Zeichnung', techDrawing({ parts: false })));

    const deckEl = h('div', { class: 'deck' });
    const bins = {};
    const binsEl = h('div', { class: 'bins' }, ['S', 'B', 'T'].map(k => (bins[k] = h('div', { class: 'bin', 'data-target': k }, h('h4', {}, BIN[k]), h('ul')))));
    const wrap = h('div', { class: 'sortwrap' }, duo, deckEl, binsEl);
    root.append(wrap);

    function showCard() {
      deckEl.innerHTML = '';
      if (i >= deck.length) return finish();
      const [text] = deck[i];
      const c = h('div', { class: 'scard', 'data-chip': String(i) }, h('small', {}, `Karte ${i + 1} von ${deck.length}`), text);
      deckEl.append(c);
      ctx.steps(deck.length, i);
    }

    function drop(chipId, target, chipEl) {
      const [text, right, why] = deck[+chipId];
      if (target === right) {
        sorted[right].push(text);
        bins[right].querySelector('ul').append(h('li', {}, text));
        ctx.feedback({ kind: 'ok', title: 'Richtig!', text: why, auto: 3500 });
        i++; showCard();
      } else {
        mistakes++;
        shake(chipEl);
        const hint = right === 'B' ? 'Das gilt für <b>beide</b> Arten von Zeichnungen.' : `Das passt zur <b>${BIN[right]}</b>.`;
        ctx.feedback({ kind: 'bad', title: 'Nicht ganz', text: `${hint} ${why}` });
        // Karte bleibt liegen – noch einmal versuchen
      }
    }

    function finish() {
      ctx.steps(1, 1);
      const st = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
      deckEl.append(h('div', { class: 'box', style: { maxWidth: '640px' } },
        h('b', {}, 'Merke: '), 'Eine ', h('b', {}, 'Skizze'), ' ist schnell und frei aus der Hand gezeichnet. Eine ', h('b', {}, 'Technische Zeichnung'),
        ' ist genau, mit Lineal gezeichnet, enthält alle Maße und wird in Normschrift beschriftet.'));
      ctx.complete(st, mistakes ? `Du hast alle Karten sortiert – mit ${mistakes} Fehlversuch${mistakes > 1 ? 'en' : ''}.` : 'Alle Karten auf Anhieb richtig sortiert!');
    }

    // Ziehen & Ablegen für die Karten
    dnd(wrap, { onDrop: drop });
    showCard();
  },
};
