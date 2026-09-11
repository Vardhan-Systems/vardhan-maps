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
  /** Camera animation for a re-fit (when `fitKey` changes). Default 900ms. */
  fitDuration?: number;
  /** Camera easing for a re-fit: "fly" gives a curved zoom-out/in (web-like flyTo,
   *  the default), "ease"/"linear" a flat move. */
  fitEasing?: "linear" | "ease" | "fly";
  /** Initial centre [lat, lng] (Leaflet order) when not auto-fitting. */
  center?: [number, number];
  /** Initial zoom (with `center`). */
  zoom?: number;
  /** Permanent name label on each boundary. */
  labels?: boolean;
  /** Show the MapLibre wordmark logo. Default true (MapLibre's own). Set false to
   *  hide it — e.g. to overlay your own brand logo. NOTE: this is only the logo;
   *  keep `attribution` on, since the OSM basemap data requires attribution (ODbL). */
  logo?: boolean;
  /** Show the attribution (ⓘ) button. Default true. Keep it on: the OpenStreetMap
   *  basemap data is licensed under ODbL, which requires visible attribution. */
  attribution?: boolean;
  /** Show the compass. Default = MapLibre's own behaviour. */
  compass?: boolean;
  /** Grey-out everything outside the region. Default true. */
  mask?: boolean;
  /** Dim outside the union of these states instead of outside all India. */
  maskStates?: string[];
  /** Mask colour. Default light grey. */
  maskColor?: string;
  /** Mask opacity (0–1). Default 0.6. */
  maskOpacity?: number;
  /**
   * Clip the whole map to the named states (`maskStates`, else `stateNames`):
   * draw ONLY those states' boundaries — not all of India — and fill everything
   * outside their union with a solid `clipColor`, hard-clipping the basemap at the
   * true state border (so no neighbouring roads/labels/outlines bleed in). Turns
   * the map into a "these states only" view. Overrides `mask`/`maskColor`/
   * `maskOpacity` with an opaque clip. Default false.
   */
  clipToStates?: boolean;
  /** Solid fill outside the clipped states (with `clipToStates`). Default `#e8e8e6`
   *  — the basemap land colour, so the exterior reads as seamless empty land. */
  clipColor?: string;
  /** Lock pan/zoom to a region `[[south,west],[north,east]]` (Leaflet order). */
  lockBounds?: [[number, number], [number, number]];
  /** Minimum zoom level. */
  minZoom?: number;
  onStateClick?: (name: string, props: Record<string, unknown>) => void;
  onDistrictClick?: (name: string, props: Record<string, unknown>) => void;
  onMarkerClick?: (marker: MapMarker) => void;
  /**
   * Fires when the map is fully rendered for the current view — every basemap
   * tile, boundary and marker painted (MapLibre's `onDidFinishRenderingMapFully`).
   * The truest "map is completely loaded" signal — use it to reveal the map only
   * once it's ready. NOTE: it can fire again after a pan/zoom re-render, so latch
   * on the first call if you only want a one-time reveal.
   */
  onRenderComplete?: () => void;
  /** Container style (defaults to `flex: 1`). */
  style?: ViewStyle;
}
