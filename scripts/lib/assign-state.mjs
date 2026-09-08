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

/** Rough centroid = average of the largest ring's vertices. */
export function centroidOf(geom) {
  let best = null;
  for (const poly of polygonsOf(geom)) {
    const outer = poly[0];
    if (outer && (!best || outer.length > best.length)) best = outer;
  }
  if (!best) return null;
  let x = 0, y = 0;
  for (const [lng, lat] of best) { x += lng; y += lat; }
  return [x / best.length, y / best.length];
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
