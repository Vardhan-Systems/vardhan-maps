/**
 * VardhanMapSpec — a small, serialisable description of a map that an AI (or any
 * caller) produces; `vardhan-maps` turns it into a rendered map. The spec never
 * references the internal renderer API, so it is safe to store, transport over
 * MCP, and validate. See `specToLeafletProps` (interactive) and `renderSpecToSvg`
 * (static preview).
 */
export type VardhanVisualization = "default" | "choropleth" | "markers" | "routes" | "heatmap";

export interface VardhanMapRegion {
  /** "india" = all states; "state"/"district" = focus one or more states' districts. */
  region: "india" | "state" | "district";
  /** Focus a single state (e.g. "Telangana") for region "state"/"district". */
  state?: string;
  /** Focus several states (e.g. ["Telangana","Andhra Pradesh"]). */
  states?: string[];
}

/** One choropleth value, keyed by state or district name (case-insensitive). */
export interface VardhanDatum {
  key: string;
  value: number;
}

/** A point to plot (customer, store, live position). Mirrors the renderer marker. */
export interface VardhanMarker {
  lat: number;
  lng: number;
  label?: string;
  permanent?: boolean;
  color?: string;
  radius?: number;
  icon?: string;
  iconSize?: [number, number];
  iconAnchor?: [number, number];
  popup?: string;
}

export interface VardhanRoutePoint {
  lat: number;
  lng: number;
  label?: string;
}

/** A polyline (GPS trail / delivery route). */
export interface VardhanRoute {
  points: VardhanRoutePoint[];
  color?: string;
  weight?: number;
  opacity?: number;
  label?: string;
  showPoints?: boolean;
  pointColor?: string;
  pointRadius?: number;
}

export interface VardhanMapOptions {
  title?: string;
  legend?: boolean;
  /** Show hover tooltips (boundary names / values). Default true. */
  tooltip?: boolean;
  /** Basemap under the boundaries. Default "vector" (self-hosted). */
  basemap?: "vector" | "raster" | "none";
  /** Choropleth colour ramp, low→high. Defaults to a blue ramp. */
  colors?: string[];
}

export interface VardhanMapSpec {
  version: "1";
  map: VardhanMapRegion;
  visualization: VardhanVisualization;
  /** Choropleth values (required when visualization is "choropleth"/"heatmap"). */
  data?: VardhanDatum[];
  markers?: VardhanMarker[];
  routes?: VardhanRoute[];
  options?: VardhanMapOptions;
}

export interface SpecError {
  path: string;
  message: string;
}

const REGIONS = new Set(["india", "state", "district"]);
const VISUALS = new Set(["default", "choropleth", "markers", "routes", "heatmap"]);
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Validate a value as a VardhanMapSpec. Returns [] when valid, else the problems. */
export function validateSpec(spec: unknown): SpecError[] {
  const errors: SpecError[] = [];
  const s = spec as Partial<VardhanMapSpec> | null;
  if (!s || typeof s !== "object") return [{ path: "", message: "Spec must be an object." }];
  if (s.version !== "1") errors.push({ path: "version", message: 'version must be "1".' });
  if (!s.map || !REGIONS.has(s.map.region))
    errors.push({ path: "map.region", message: "region must be india, state or district." });
  if (!s.visualization || !VISUALS.has(s.visualization))
    errors.push({ path: "visualization", message: "unknown visualization." });

  const needsData = s.visualization === "choropleth" || s.visualization === "heatmap";
  if (needsData && !(Array.isArray(s.data) && s.data.length > 0))
    errors.push({ path: "data", message: `${s.visualization} needs a non-empty data array.` });
  for (const [i, d] of (s.data ?? []).entries()) {
    if (!d || typeof d.key !== "string" || !d.key.trim())
      errors.push({ path: `data[${i}].key`, message: "key must be a non-empty string." });
    if (!num(d?.value)) errors.push({ path: `data[${i}].value`, message: "value must be a number." });
  }
  if (s.visualization === "markers" && !(s.markers && s.markers.length))
    errors.push({ path: "markers", message: "markers visualization needs markers." });
  if (s.visualization === "routes" && !(s.routes && s.routes.length))
    errors.push({ path: "routes", message: "routes visualization needs routes." });
  for (const [i, m] of (s.markers ?? []).entries())
    if (!num(m?.lat) || !num(m?.lng))
      errors.push({ path: `markers[${i}]`, message: "marker needs numeric lat/lng." });
  for (const [i, r] of (s.routes ?? []).entries())
    if (!Array.isArray(r?.points) || r.points.length < 2)
      errors.push({ path: `routes[${i}].points`, message: "a route needs at least two points." });
  return errors;
}
