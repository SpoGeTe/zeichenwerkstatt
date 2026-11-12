// Einfache Normschrift (angelehnt an ISO 3098, senkrecht).
// Jedes Zeichen besteht aus Strichen; Koordinaten in Einheiten, Höhe 10, y nach unten.

function arc(cx, cy, rx, ry, a0, a1, step = 12) {
  const pts = [], n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
  return pts;
}

export const GLYPHS = {
  A: [[[0, 10], [3, 0], [6, 10]], [[1.1, 6.5], [4.9, 6.5]]],
  B: [[[0, 10], [0, 0], [3.2, 0], ...arc(3.2, 2.5, 2.5, 2.5, -90, 90), [0, 5]], [[3.2, 5], ...arc(3.4, 7.5, 2.6, 2.5, -90, 90), [0, 10]]],
  C: [arc(3, 5, 3, 5, -40, -320)],
  D: [[[0, 0], [0, 10], [2.5, 10], ...arc(2.5, 5, 3.3, 5, 90, -90), [0, 0]]],
  E: [[[5, 0], [0, 0], [0, 10], [5, 10]], [[0, 5], [4, 5]]],
  F: [[[5, 0], [0, 0], [0, 10]], [[0, 5], [4, 5]]],
  G: [[...arc(3, 5, 3, 5, -40, -360), [3.5, 5]]],
  H: [[[0, 0], [0, 10]], [[5, 0], [5, 10]], [[0, 5], [5, 5]]],
  I: [[[0, 0], [0, 10]]],
  J: [[[4, 0], [4, 7.6], ...arc(2, 7.6, 2, 2.4, 0, 180)]],
  K: [[[0, 0], [0, 10]], [[5, 0], [0, 6.5]], [[1.8, 4.6], [5, 10]]],
  L: [[[0, 0], [0, 10], [5, 10]]],
  M: [[[0, 10], [0, 0], [3, 6], [6, 0], [6, 10]]],
  N: [[[0, 10], [0, 0], [5, 10], [5, 0]]],
  O: [arc(3, 5, 3, 5, 0, 360)],
  P: [[[0, 10], [0, 0], [3, 0], ...arc(3, 2.75, 2.6, 2.75, -90, 90), [0, 5.5]]],
  Q: [arc(3, 5, 3, 5, 0, 360), [[3.8, 7.4], [6.2, 10.4]]],
  R: [[[0, 10], [0, 0], [3, 0], ...arc(3, 2.75, 2.6, 2.75, -90, 90), [0, 5.5]], [[2.8, 5.5], [5.4, 10]]],
  S: [[...arc(2.8, 2.6, 2.6, 2.6, -20, -270), ...arc(2.8, 7.5, 2.8, 2.5, -90, 165)]],
  T: [[[0, 0], [6, 0]], [[3, 0], [3, 10]]],
  U: [[[0, 0], [0, 7], ...arc(2.6, 7, 2.6, 3, 180, 0), [5.2, 0]]],
  V: [[[0, 0], [3, 10], [6, 0]]],
  W: [[[0, 0], [1.75, 10], [3.5, 3], [5.25, 10], [7, 0]]],
  X: [[[0, 0], [5.5, 10]], [[5.5, 0], [0, 10]]],
  Y: [[[0, 0], [3, 5], [6, 0]], [[3, 5], [3, 10]]],
  Z: [[[0, 0], [5.5, 0], [0, 10], [5.5, 10]]],
  0: [arc(2.75, 5, 2.75, 5, 0, 360)],
  1: [[[0, 2.6], [2.8, 0], [2.8, 10]]],
  2: [[...arc(2.75, 2.75, 2.75, 2.75, -165, 25), [0, 10], [5.5, 10]]],
  3: [[[0.3, 0], [5, 0], [2.4, 4], ...arc(2.7, 7, 2.8, 3, -95, 150)]],
  4: [[[4, 10], [4, 0], [0, 7], [5.8, 7]]],
  5: [[[5, 0], [0.8, 0], [0.4, 4.6], ...arc(2.8, 7, 2.8, 3, -125, 150)]],
  6: [[...arc(4.6, 7, 4.5, 7, -90, -180)], arc(2.9, 7, 2.8, 3, 0, 360)],
  7: [[[0, 0], [5.5, 0], [1.8, 10]]],
  8: [arc(2.75, 2.5, 2.4, 2.5, 0, 360), arc(2.75, 7.25, 2.75, 2.75, 0, 360)],
  9: [arc(2.6, 3, 2.8, 3, 0, 360), [...arc(1, 3, 4.5, 7, 0, 90)]],
};

export function glyphBox(ch) {
  const g = GLYPHS[ch];
  let x0 = Infinity, x1 = -Infinity;
  g.forEach(s => s.forEach(([x]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }));
  return { x0, x1, w: x1 - x0 };
}

// Zeichen an Position (ox = Mitte, oy = Oberkante) mit Höhe hgt als SVG-Pfad
export function glyphPath(ch, cx, top, hgt) {
  const k = hgt / 10, b = glyphBox(ch), ox = cx - (b.x0 + b.w / 2) * k;
  return GLYPHS[ch].map(s => 'M' + s.map(([x, y]) => `${(ox + x * k).toFixed(1)},${(top + y * k).toFixed(1)}`).join('L')).join('');
}

// Punkte entlang des Zeichens (für die Auswertung)
export function glyphSamples(ch, cx, top, hgt, step = 2) {
  const k = hgt / 10, b = glyphBox(ch), ox = cx - (b.x0 + b.w / 2) * k, out = [];
  for (const s of GLYPHS[ch]) {
    for (let i = 1; i < s.length; i++) {
      const ax = ox + s[i - 1][0] * k, ay = top + s[i - 1][1] * k, bx = ox + s[i][0] * k, by = top + s[i][1] * k;
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
      for (let j = 0; j < n; j++) out.push([ax + (bx - ax) * j / n, ay + (by - ay) * j / n]);
    }
    const l = s[s.length - 1]; out.push([ox + l[0] * k, top + l[1] * k]);
  }
  return out;
}
