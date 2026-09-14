/**
 * vardhan-maps/spec — the AI-facing map contract.
 *
 * A `VardhanMapSpec` is a small serialisable object describing a map (region,
 * visualization, choropleth data, markers, routes, options). Produce one from an
 * AI/tool call, `validateSpec` it, then render:
 *   - `specToLeafletProps(spec)` → props for the interactive <IndiaLeafletMap>.
 *   - `renderSpecToSvg(spec)`    → a static SVG string (inline preview).
 */
export type {
  VardhanMapSpec,
  VardhanMapRegion,
  VardhanVisualization,
  VardhanDatum,
  VardhanMarker,
  VardhanRoute,
  VardhanRoutePoint,
  VardhanMapOptions,
  SpecError,
} from "./types";
export { validateSpec } from "./types";
export { buildColorScale, DEFAULT_RAMP, type ColorScale } from "./color-scale";
export { specToLeafletProps } from "./to-props";
export { renderSpecToSvg, type RenderSpecSvgOptions } from "./to-svg";
