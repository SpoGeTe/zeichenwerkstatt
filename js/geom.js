// Geometrie-Helfer für Zeichnungen auf Kästchenpapier.
// Jede Strecke wird in Kästchen-Einzelstücke zerlegt; so lassen sich
// Zeichnung und Lösung unabhängig von der Reihenfolge der Striche vergleichen.

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const key = (x1, y1, x2, y2) => (x1 < x2 || (x1 === x2 && y1 <= y2)) ? `${x1},${y1}:${x2},${y2}` : `${x2},${y2}:${x1},${y1}`;

export function addSeg(set, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const g = gcd(Math.abs(dx), Math.abs(dy));
  if (!g) return;
  const sx = dx / g, sy = dy / g;
  for (let i = 0; i < g; i++) {
    const x = a[0] + i * sx, y = a[1] + i * sy;
    set.add(key(x, y, x + sx, y + sy));
  }
}
export function polyEdges(pts, closed = true, set = new Set()) {
  for (let i = 1; i < pts.length; i++) addSeg(set, pts[i - 1], pts[i]);
  if (closed) addSeg(set, pts[pts.length - 1], pts[0]);
  return set;
}
export function scalePts(pts, f) { return pts.map(([x, y]) => [x * f, y * f]); }

// Lineal-Striche einer Zeichenfläche → Kästchen-Kanten je Linienart
export function drawnEdges(strokes, cell) {
  const out = { wide: new Set(), thin: new Set(), dash: new Set(), dashdot: new Set(), free: 0, offgrid: 0 };
  for (const s of strokes) {
    if (s.type !== 'line') { out.free++; continue; }
    const a = [Math.round(s.pts[0].x / cell), Math.round(s.pts[0].y / cell)];
    const b = [Math.round(s.pts[1].x / cell), Math.round(s.pts[1].y / cell)];
    const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
    if (!dx && !dy) continue;
    out[s.style] && addSeg(out[s.style], a, b);
  }
  return out;
}

export function parseKey(k) { return k.split(':').map(p => p.split(',').map(Number)); }
export function bbox(set) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const k of set) for (const [x, y] of parseKey(k)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}
export function shift(set, dx, dy) {
  const out = new Set();
  for (const k of set) { const [[a, b], [c, d]] = parseKey(k); out.add(key(a + dx, b + dy, c + dx, d + dy)); }
  return out;
}
export const minus = (a, b) => [...a].filter(k => !b.has(k));

// SVG-Pfad aus Kanten (z. B. für „fehlt noch“-Markierungen)
export function edgesPath(keys, cell, ox = 0, oy = 0) {
  return keys.map(k => { const [[a, b], [c, d]] = parseKey(k); return `M${(a + ox) * cell},${(b + oy) * cell}L${(c + ox) * cell},${(d + oy) * cell}`; }).join('');
}

// Polygon-Helfer (für die Bemaßung)
export function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Vergleicht eine Gitterzeichnung mit der Lösung.
// expected: { wide:[pts…], dash:[[a,b],…], center:{ x|y, from, to, coreFrom, coreTo } }
export function compareGrid(drawn, exp) {
  const res = { empty: false, scale: 1, missing: [], extra: [], wrongStyle: [], centerMissing: false, dashMissing: [], dashExtra: [], offset: [0, 0] };
  const expWide = new Set();
  for (const poly of exp.wide) polyEdges(poly, true, expWide);
  if (!drawn.wide.size) { res.empty = true; return res; }
  const eb = bbox(expWide), db = bbox(drawn.wide);
  res.scale = (db.w / eb.w + db.h / eb.h) / 2;
  res.sizeW = db.w; res.sizeH = db.h; res.expW = eb.w; res.expH = eb.h;
  const ox = db.x0 - eb.x0, oy = db.y0 - eb.y0;
  res.offset = [ox, oy];
  const wide = shift(drawn.wide, -ox, -oy);
  res.missing = minus(expWide, wide);
  res.extra = minus(wide, expWide);
  // falsche Linienart an einer Umrisskante?
  const others = ['thin', 'dash', 'dashdot'].map(s => [s, shift(drawn[s], -ox, -oy)]);
  for (const k of res.missing) for (const [s, set] of others) if (set.has(k)) { res.wrongStyle.push(s); break; }
  if (exp.dash) {
    const expDash = new Set(); exp.dash.forEach(([a, b]) => addSeg(expDash, a, b));
    const d = shift(drawn.dash, -ox, -oy);
    res.dashMissing = minus(expDash, d);
    res.dashExtra = minus(d, expDash);
    res.expDash = expDash;
  }
  if (exp.center) {
    const c = exp.center; const core = new Set(); addSeg(core, c.a, c.b);
    const dd = shift(drawn.dashdot, -ox, -oy);
    res.centerMissing = minus(core, dd).length > 0;
    // Mittellinie darf über das Werkstück hinausragen, aber nur auf derselben Achse
    res.centerExtra = [...dd].filter(k => { const [[x1, y1], [x2, y2]] = parseKey(k); return c.vertical ? !(x1 === c.a[0] && x2 === c.a[0] && Math.min(y1, y2) >= c.a[1] - c.over && Math.max(y1, y2) <= c.b[1] + c.over) : true; });
    res.centerShort = !res.centerMissing && ![...dd].some(k => { const [[, y1], [, y2]] = parseKey(k); return Math.min(y1, y2) < c.a[1]; });
  }
  res.thinExtra = shift(drawn.thin, -ox, -oy).size;
  return res;
}
