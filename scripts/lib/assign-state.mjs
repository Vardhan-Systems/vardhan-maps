// Assign each district to its parent state by testing the district's centroid
// against the state polygons (ray casting, holes + multipolygon aware). OSM
// admin_level=5 relations don't carry a clean parent-state tag, so we derive it.

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(x, y, rings) {
  if (!rings.length || !inRing(x, y, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) if (inRing(x, y, rings[i])) return false;
  return true;
}

function polygonsOf(geom) {
  if (geom.type === "Polygon") return [geom.coordinates];
  if (geom.type === "MultiPolygon") return geom.coordinates;
  return [];
}

/** The largest outer ring of a geometry (by vertex count). */
function largestOuterRing(geom) {
  let best = null;
  for (const poly of polygonsOf(geom)) {
    const outer = poly[0];
    if (outer && (!best || outer.length > best.length)) best = outer;
  }
  return best;
}

/** Rough centroid = average of the largest ring's vertices (may be OUTSIDE a
 *  concave ring — use pointOnSurface when you need a guaranteed-interior point). */
export function centroidOf(geom) {
  const best = largestOuterRing(geom);
  if (!best) return null;
  let x = 0, y = 0;
  for (const [lng, lat] of best) { x += lng; y += lat; }
  return [x / best.length, y / best.length];
}

/**
 * A point guaranteed to lie INSIDE the largest ring: scan a horizontal line at
 * the ring's mid-latitude, and return the midpoint of its longest interior
 * chord. Robust for concave/banana-shaped districts where the centroid escapes.
 */
export function pointOnSurface(geom) {
  const ring = largestOuterRing(geom);
  if (!ring) return null;
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of ring) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const y = (minY + maxY) / 2;
  const xs = [];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][1], yj = ring[j][1];
    if ((yi > y) !== (yj > y)) {
      xs.push(ring[j][0] + ((y - yj) / (yi - yj)) * (ring[i][0] - ring[j][0]));
    }
  }
  xs.sort((a, b) => a - b);
  let bestMid = null, bestLen = -1;
  for (let k = 0; k + 1 < xs.length; k += 2) {
    const len = xs[k + 1] - xs[k];
    if (len > bestLen) { bestLen = len; bestMid = (xs[k] + xs[k + 1]) / 2; }
  }
  return bestMid == null ? centroidOf(geom) : [bestMid, y];
}

/** Fallback: the state containing the most of this geometry's boundary vertices. */
export function stateByVertexMajority(geom, stateFeatures) {
  const tally = new Map();
  for (const poly of polygonsOf(geom)) {
    for (const ring of poly) {
      for (const [lng, lat] of ring) {
        const s = stateAt(lng, lat, stateFeatures);
        if (s) tally.set(s, (tally.get(s) ?? 0) + 1);
      }
    }
  }
  let best = "", n = 0;
  for (const [s, c] of tally) if (c > n) { n = c; best = s; }
  return best;
}

/** Return the name of the state whose polygon contains [lng, lat], or "". */
export function stateAt(lng, lat, stateFeatures) {
  for (const f of stateFeatures) {
    for (const poly of polygonsOf(f.geometry)) {
      if (inPolygon(lng, lat, poly)) return f.properties?.name ?? "";
    }
  }
  return "";
}
