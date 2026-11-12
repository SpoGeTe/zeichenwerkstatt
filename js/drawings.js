// Wiederverwendbare Zeichnungen (selbst gezeichnet nach dem Arbeitsblatt).

export function arrow(x, y, dir, L = 11, W = 3.4) {
  const p = {
    r: [[x, y], [x - L, y - W], [x - L, y + W]],
    l: [[x, y], [x + L, y - W], [x + L, y + W]],
    u: [[x, y], [x - W, y + L], [x + W, y + L]],
    d: [[x, y], [x - W, y - L], [x + W, y - L]],
  }[dir];
  return `<path class="ah" d="M${p.map(q => q.join(',')).join('L')}Z"/>`;
}

// Werkstück aus Blatt 1/2 (Maße in mm, 1 mm = 5 px)
// Eckpunkte: (0,0) (51,0) (51,17) (38,17) (38,30) (23,30) (23,17) (0,30) – y nach oben
export const WP_PATH = 'M190,330L445,330L445,245L380,245L380,180L305,180L305,245L190,180Z';

export function techDrawing({ parts = true } = {}) {
  const g = (id, inner) => parts ? `<g class="hlg" data-part="${id}">${inner}</g>` : inner;
  return [
    g('kante', `<path class="wp" d="${WP_PATH}"/>`),
    g('dicke', `<text class="dim" x="246" y="300">t=2</text>`),
    g('hilfs', `<path class="thin" d="M190,336V392M445,336V392M190,174V118M305,174V118M380,174V118M451,245H525M451,330H570M386,180H570"/>`),
    g('linie', `<path class="thin" d="M190,386H445M190,126H380M515,245V330M560,180V330"/>`),
    g('pfeil', arrow(190, 386, 'l') + arrow(445, 386, 'r') + arrow(190, 126, 'l') + arrow(305, 126, 'r') + arrow(305, 126, 'l') + arrow(380, 126, 'r') +
      arrow(515, 245, 'u') + arrow(515, 330, 'd') + arrow(560, 180, 'u') + arrow(560, 330, 'd')),
    g('zahl', `<text class="dim" x="308" y="380">51</text><text class="dim" x="238" y="120">23</text><text class="dim" x="334" y="120">15</text>` +
      `<text class="dim" transform="translate(508,295) rotate(-90)">17</text><text class="dim" transform="translate(553,262) rotate(-90)">30</text>`),
  ].join('');
}

// Handskizze: gleiche Form, aber krumme Linien und nur zwei Maße
function wobble(pts, seed = 1, amp = 2.2) {
  let r = seed;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 - 0.5; };
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 30));
    if (i === 0) d += `M${x1 + rnd() * amp},${y1 + rnd() * amp}`;
    for (let k = 1; k <= n; k++) {
      const t = k / n, mx = x1 + (x2 - x1) * (t - 0.5 / n), my = y1 + (y2 - y1) * (t - 0.5 / n);
      d += `Q${mx + rnd() * amp * 2},${my + rnd() * amp * 2} ${x1 + (x2 - x1) * t + rnd() * amp},${y1 + (y2 - y1) * t + rnd() * amp}`;
    }
  }
  return d;
}
export function sketchDrawing() {
  const P = [[190, 330], [445, 330], [445, 245], [380, 245], [380, 180], [305, 180], [305, 245], [190, 180], [190, 330]];
  return `<path d="${wobble(P, 7)}" fill="none" stroke="var(--ink)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
   <path d="${wobble([[192, 372], [440, 368]], 3, 1.5)}" fill="none" stroke="var(--ink)" stroke-width="1.3"/>
   <path d="M192,372l9,-4l-1,8zM440,368l-9,-4l1,8z" fill="var(--ink)"/>
   <text x="300" y="362" font-family="Atkinson Hyperlegible" font-size="20" fill="var(--ink)" transform="rotate(-2 300 362)">51</text>
   <path d="${wobble([[480, 182], [484, 328]], 5, 1.5)}" fill="none" stroke="var(--ink)" stroke-width="1.3"/>
   <text x="470" y="268" font-family="Atkinson Hyperlegible" font-size="20" fill="var(--ink)" transform="rotate(-88 470 268)">30</text>`;
}
