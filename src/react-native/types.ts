import type { ViewStyle } from "react-native";
import type { Resolution } from "../data";
import type { MapMarker, MapRoute, MapRoutePoint } from "../react/IndiaLeafletMap";
import type { VectorStyle } from "../react/vector";

// Re-export the shared marker/route/vector types so RN consumers import them
// from `vardhan-maps/react-native` without reaching into the web renderer.
export type { MapMarker, MapRoute, MapRoutePoint, VectorStyle };

/**
 * Boundary style — the subset of Leaflet `PathOptions` that maps cleanly to
 * MapLibre paint (line + fill). Returned by `districtFill`/`stateFill` for
 * choropleths, or passed as `stateStyle`/`districtStyle`.
 */
export interface BoundaryStyle {
  /** Border (line) colour. */
  color?: string;
  /** Border width in px. */
  weight?: number;
  /** Border opacity (0–1). */
  opacity?: number;
  /** Whether to fill the shape. `false` forces fill-opacity 0. */
  fill?: boolean;
  /** Fill colour. */
  fillColor?: string;
  /** Fill opacity (0–1). */
  fillOpacity?: number;
}

export interface IndiaMapNativeProps {
  /** Which boundaries to draw. Default "state". */
  level?: "state" | "district" | "both";
  /** Restrict districts to one state. */
  stateName?: string;
  /** Restrict districts to several states (e.g. ["Telangana","Andhra Pradesh"]). */
  stateNames?: string[];
  /** District resolution to lazy-load — "low" (default) or "high". */
  resolution?: Resolution;
  /** Render the default self-hosted grey vector basemap (zero-config). Default true. */
  vector?: boolean;
  /** A custom MapLibre style (from `vectorBasemapStyle(...)`) or a style URL. */
  vectorStyle?: VectorStyle | string;
  /** Base style for state borders. */
  stateStyle?: BoundaryStyle;
  /** Base style for district borders. */
  districtStyle?: BoundaryStyle;
  /** Choropleth: per-district style overrides (merged over `districtStyle`). */
  districtFill?: (name: string, props: Record<string, unknown>) => BoundaryStyle | undefined;
  /** Choropleth: per-state style overrides (merged over `stateStyle`). */
  stateFill?: (name: string, props: Record<string, unknown>) => BoundaryStyle | undefined;
  /** Bump when your fill data changes so the overlay redraws. */
  dataKey?: string | number;
  /** Points to plot (lat/lng), each with an optional label + permanent chip. */
  markers?: MapMarker[];
  /** Polylines (GPS trails / routes), optional per-ping dots via `showPoints`. */
  routes?: MapRoute[];
  /**
   * Framing: "region" keeps the locked region view, "data" fits markers/routes
   * once (re-fits when `fitKey` changes), "none" leaves the view to center/zoom.
   */
  fitTo?: "region" | "data" | "none";
  /** With `fitTo="data"`: re-fit whenever this changes (first fit instant, later fly). */
  fitKey?: string | number;
  /** Initial centre [lat, lng] (Leaflet order) when not auto-fitting. */
  center?: [number, number];
  /** Initial zoom (with `center`). */
  zoom?: number;
  /** Permanent name label on each boundary. */
  labels?: boolean;
  /** Grey-out everything outside the region. Default true. */
  mask?: boolean;
  /** Dim outside the union of these states instead of outside all India. */
  maskStates?: string[];
  /** Mask colour. Default light grey. */
  maskColor?: string;
  /** Mask opacity (0–1). Default 0.6. */
  maskOpacity?: number;
  /** Lock pan/zoom to a region `[[south,west],[north,east]]` (Leaflet order). */
  lockBounds?: [[number, number], [number, number]];
  /** Minimum zoom level. */
  minZoom?: number;
  onStateClick?: (name: string, props: Record<string, unknown>) => void;
  onDistrictClick?: (name: string, props: Record<string, unknown>) => void;
  onMarkerClick?: (marker: MapMarker) => void;
  /** Container style (defaults to `flex: 1`). */
  style?: ViewStyle;
}
