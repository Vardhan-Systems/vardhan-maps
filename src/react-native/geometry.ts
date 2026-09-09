// Pure GeoJSON helpers for the React Native (MapLibre Native) renderer: the
// outside-region mask, camera bounds, and turning markers/routes + boundary
// choropleth into GeoJSON with per-feature style properties (MapLibre Native is
// data-driven, so per-feature styles are stamped into properties and read back
// with `["get", …]` expressions — the native analogue of Leaflet's per-feature
// style callback).
import { getStates, indiaOutline } from "../data";
import type { MapMarker, MapRoute } from "../react/IndiaLeafletMap";
import type { BoundaryStyle } from "./types";

type AnyGeom = { type: string; coordinates: unknown };
/** Normalize Polygon | MultiPolygon coordinates to MultiPolygon rings. */
function asMultiPolygon(g: AnyGeom): number[][][][] {
  return (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as number[][][][];
}

/** [west, south, east, north] — MapLibre RN's LngLatBounds order. */
export type Bounds4 = [number, number, number, number];

/** World rectangle with the region (states union, or all India) punched out as
 *  holes — a fill over this dims everything outside the region. */
export function maskFeature(maskStates?: string[]): GeoJSON.Feature {
  const world = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
  let holes: number[][][];
  if (maskStates?.length) {
    const want = new Set(maskStates);
    holes = getStates()
      .filter((f) => want.has((f.properties as { name: string }).name))
      .flatMap((f) => asMultiPolygon(f.geometry as AnyGeom).map((poly) => poly[0]));
  } else {
    holes = asMultiPolygon(indiaOutline.geometry as AnyGeom).map((poly) => poly[0]);
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [world, ...holes] },
    properties: {},
  };
}

function boundsOf(coords: [number, number][]): Bounds4 | null {
  if (!coords.length) return null;
  let w = 180, s = 90, e = -180, n = -90;
  for (const [lng, lat] of coords) {
    if (lng < w) w = lng;
    if (lng > e) e = lng;
    if (lat < s) s = lat;
    if (lat > n) n = lat;
  }
  return [w, s, e, n];
}

/** Fit extent for the data — prefers the routes' extent (a selected trail) over
 *  the markers, mirroring the Leaflet renderer. */
export function dataBounds(markers?: MapMarker[], routes?: MapRoute[]): Bounds4 | null {
  const routePts: [number, number][] = [];
  for (const r of routes ?? []) for (const p of r.points) routePts.push([p.lng, p.lat]);
  if (routePts.length) return boundsOf(routePts);
  return boundsOf((markers ?? []).map((m) => [m.lng, m.lat]));
}

/** Leaflet [[S,W],[N,E]] → MapLibre [W,S,E,N]. */
export function boundsFromLeaflet(b: [[number, number], [number, number]]): Bounds4 {
  const [[s, w], [n, e]] = b;
  return [w, s, e, n];
}

/** Stamp per-feature boundary style into properties for data-driven paint. */
export function stampBoundaries(
  features: GeoJSON.Feature[],
  base: Required<BoundaryStyle>,
  fill?: (name: string, props: Record<string, unknown>) => BoundaryStyle | undefined,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features.map((f) => {
      const props = (f.properties ?? {}) as Record<string, unknown>;
      const name = String(props.name ?? "");
      const s = { ...base, ...(fill?.(name, props) ?? {}) };
      return {
        ...f,
        properties: {
          ...props,
          _lc: s.color,
          _lw: s.weight,
          _lo: s.opacity,
          _fc: s.fillColor,
          _fo: s.fill === false ? 0 : s.fillOpacity,
        },
      };
    }),
  };
}

/** Points FeatureCollection for the markers (index stamped for click mapping). */
export function markersFC(markers: MapMarker[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: markers.map((m, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [m.lng, m.lat] },
      properties: {
        _idx: i,
        color: m.color ?? "#2563eb",
        radius: m.radius ?? 5,
        label: m.label ?? "",
        permanent: m.permanent ? 1 : 0,
      },
    })),
  };
}

/** LineStrings for the routes, with per-feature colour/weight/opacity. */
export function routeLinesFC(routes: MapRoute[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: routes
      .filter((r) => r.points.length > 1)
      .map((r) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: r.points.map((p) => [p.lng, p.lat]) },
        properties: {
          _lc: r.color ?? "#2563eb",
          _lw: r.weight ?? 3,
          _lo: r.opacity ?? 1,
        },
      })),
  };
}

/** Per-ping dots for routes that asked for `showPoints`. */
export function routePointsFC(routes: MapRoute[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const r of routes) {
    if (!r.showPoints) continue;
    for (const p of r.points) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: { color: r.pointColor ?? r.color ?? "#ef4444", radius: r.pointRadius ?? 3 },
      });
    }
  }
  return { type: "FeatureCollection", features };
}
