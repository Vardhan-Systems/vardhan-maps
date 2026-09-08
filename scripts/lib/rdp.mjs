// Douglas–Peucker line simplification, ring/polygon aware.
// A closed ring (first point == last) has a degenerate baseline, so we split it
// at the vertex farthest from the first point before simplifying each half —
// exactly the fix used in the Beyond dashboard-map pipeline.

function perpDist(p, a, b) {
  const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

function rdpOpen(points, eps) {
  if (points.length < 3) return points.slice();
  let maxD = 0, idx = 0;
  const a = points[0], b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], a, b);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [a, b];
  const left = rdpOpen(points.slice(0, idx + 1), eps);
  const right = rdpOpen(points.slice(idx), eps);
  return left.slice(0, -1).concat(right);
}

/** Simplify one linear ring (assumed closed) with tolerance `eps` (degrees). */
export function simplifyRing(ring, eps) {
  if (ring.length <= 4) return ring;
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const pts = closed ? ring.slice(0, -1) : ring.slice();
  // Split the closed loop at the vertex farthest from pts[0].
  let far = 1, farD = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > farD) { farD = d; far = i; }
  }
  const first = rdpOpen(pts.slice(0, far + 1), eps);
  const second = rdpOpen(pts.slice(far), eps).concat([pts[0]]);
  const out = first.slice(0, -1).concat(second);
  if (out.length < 4) return ring; // never collapse below a triangle+close
  return out;
}

/** Simplify a Polygon/MultiPolygon geometry in place-safe fashion. */
export function simplifyGeometry(geom, eps) {
  if (geom.type === "Polygon") {
    return { type: "Polygon", coordinates: geom.coordinates.map((r) => simplifyRing(r, eps)) };
  }
  if (geom.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geom.coordinates.map((poly) => poly.map((r) => simplifyRing(r, eps))),
    };
  }
  return geom;
}
