import type { Feature, FeatureCollection, Position } from "geojson";
import type { StateGeometry } from "../data/types";

/** [minLng, minLat, maxLng, maxLat]. */
export type Bbox = [number, number, number, number];

/** Call `fn` for every linear ring of a Polygon / MultiPolygon geometry. */
export function eachRing(geom: StateGeometry, fn: (ring: Position[]) => void): void {
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) fn(ring);
  } else {
    for (const poly of geom.coordinates) for (const ring of poly) fn(ring);
  }
}

/** Bounding box of a feature collection (throws if it has no coordinates). */
export function bboxOf<P>(fc: FeatureCollection<StateGeometry, P>): Bbox {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const f of fc.features) {
    eachRing(f.geometry, (ring) => {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      }
    });
  }
  if (!Number.isFinite(minLng)) throw new Error("bboxOf: empty geometry");
  return [minLng, minLat, maxLng, maxLat];
}

/** Merge two bounding boxes. */
export function unionBbox(a: Bbox, b: Bbox): Bbox {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.max(a[3], b[3]),
  ];
}

/** Convenience for a single feature. */
export function featureBbox<P>(f: Feature<StateGeometry, P>): Bbox {
  return bboxOf({ type: "FeatureCollection", features: [f] });
}
