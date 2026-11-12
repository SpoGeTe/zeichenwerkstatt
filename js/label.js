// Beschriftungs-Aufgabe: Begriffe an die richtige Stelle einer Zeichnung ziehen.
import { h, svg, dnd, shake, shuffle } from './ui.js';

export function slotMarkup(s) {
  const { x, y, w, lead } = s, hgt = 40;
  const cx = x + w / 2, cy = y + hgt / 2;
  let out = '';
  if (lead) {
    const lx = lead[0] < x ? x : lead[0] > x + w ? x + w : cx;
    const ly = lead[1] < y ? y : lead[1] > y + hgt ? y + hgt : cy;
    out += `<path class="lead" d="M${lx},${ly}L${lead[0]},${lead[1]}"/><circle class="dot" cx="${lead[0]}" cy="${lead[1]}" r="3"/>`;
  }
  out += `<rect class="slot" data-target="${s.id}" data-slot="${s.id}" x="${x}" y="${y}" width="${w}" height="${hgt}" rx="8"/>`;
  out += `<text class="slottxt" data-txt="${s.id}" x="${cx}" y="${cy}"></text>`;
  return out;
}

// opts: { drawing, viewBox, slots:[{id,x,y,w,lead,answer,desc}], chips:[{id,label,rule}], onDone(mistakes) }
export function labeling(host, side, ctx, opts) {
  const { drawing, viewBox, slots, chips } = opts;
  let mistakes = 0, solved = 0;
  const pic = svg(drawing + slots.map(slotMarkup).join(''), viewBox);
  const sheet = h('div', { class: 'sheet' }, pic);
  host.append(sheet);

  // gleiche Begriffe (z. B. bei Station 4 nicht nötig) – jeder Begriff einmal
  const chipEls = shuffle(chips).map(c => h('div', { class: 'chip', 'data-chip': c.id }, c.label));
  side.append(h('span', { class: 'lbl' }, 'Begriffe'), h('div', { class: 'chips' + (opts.wrap ? ' wrap' : '') }, chipEls));

  const filled = {};
  const root = host.parentElement;
  dnd(root, {
    onDrop(chipId, slotId, chipEl) {
      const slot = slots.find(s => s.id === slotId);
      if (!slot || filled[slotId]) return;
      const chip = chips.find(c => c.id === chipId);
      const rect = pic.querySelector(`[data-slot="${slotId}"]`);
      const txt = pic.querySelector(`[data-txt="${slotId}"]`);
      const ok = Array.isArray(slot.answer) ? slot.answer.includes(chipId) : slot.answer === chipId;
      if (ok) {
        filled[slotId] = chipId; solved++;
        rect.setAttribute('class', 'slot ok'); txt.setAttribute('class', 'slottxt ok'); txt.textContent = chip.label;
        rect.removeAttribute('data-target');
        chipEl.classList.add('used');
        ctx.feedback({ kind: 'ok', title: 'Richtig!', text: chip.rule, auto: 4000 });
        if (solved === slots.length) setTimeout(() => opts.onDone(mistakes), 600);
      } else {
        mistakes++;
        rect.setAttribute('class', 'slot bad'); txt.textContent = chip.label;
        shake(chipEl);
        setTimeout(() => { if (!filled[slotId]) { rect.setAttribute('class', 'slot'); txt.textContent = ''; } }, 1300);
        ctx.feedback({ kind: 'bad', title: 'Noch nicht ganz',
          text: `Hier zeigt die Linie auf <b>${slot.desc}</b>.<br>${chip.label}: ${chip.rule}` });
      }
    },
  });
  return { sheet, pic };
}
