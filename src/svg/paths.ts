import type { Feature } from "geojson";
import type { StateGeometry } from "../data/types";
import { eachRing } from "../core/geo";
import type { Projection } from "./project";

/** One renderable feature: an SVG path `d` string plus its GeoJSON properties. */
export interface FeaturePath<P> {
  d: string;
  properties: P;
}

function fmt(n: number): string {
  // Trim to 2 decimals of a pixel — plenty for screen, keeps the path small.
  return (Math.round(n * 100) / 100).toString();
}

/** Build an SVG path `d` (all rings of the geometry) under a projection. */
export function geometryToPath(geom: StateGeometry, projection: Projection): string {
  let d = "";
  eachRing(geom, (ring) => {
    let i = 0;
    for (const [lng, lat] of ring) {
      const [x, y] = projection.project(lng, lat);
      d += (i === 0 ? "M" : "L") + fmt(x) + " " + fmt(y);
      i++;
    }
    d += "Z";
  });
  return d;
}

/** Project a list of features into path strings (skipping empty geometries). */
export function featurePaths<P>(
  features: Feature<StateGeometry, P>[],
  projection: Projection,
): FeaturePath<P>[] {
  const out: FeaturePath<P>[] = [];
  for (const f of features) {
    const d = geometryToPath(f.geometry, projection);
    if (d) out.push({ d, properties: f.properties });
  }
  return out;
}
