import type { IndiaLeafletMapProps, MapMarker, MapRoute } from "../react";
import type { VardhanMapSpec } from "./types";
import { buildColorScale } from "./color-scale";

/** Lower-cased key → value map for choropleth lookups. */
function dataMap(spec: VardhanMapSpec): Map<string, number> {
  return new Map((spec.data ?? []).map((d) => [d.key.trim().toLowerCase(), d.value]));
}

/**
 * Turn a serialisable VardhanMapSpec into props for `IndiaLeafletMap` (the
 * interactive renderer). Pure — build the props at render time from a stored spec.
 * Choropleth fills come from `spec.data`; markers/routes pass straight through.
 */
export function specToLeafletProps(spec: VardhanMapSpec): Partial<IndiaLeafletMapProps> {
  const focusStates = spec.map.states ?? (spec.map.state ? [spec.map.state] : undefined);
  const level: "state" | "district" = spec.map.region === "india" ? "state" : "district";

  const values = dataMap(spec);
  const scale = buildColorScale([...values.values()], spec.options?.colors);
  const hasData = values.size > 0;
  const fill = (name: string) => {
    const v = values.get(name.trim().toLowerCase());
    return v === undefined ? undefined : { fillColor: scale.colorFor(v), fillOpacity: 0.8, weight: 1 };
  };

  const basemap = spec.options?.basemap ?? "vector";
  const props: Partial<IndiaLeafletMapProps> = {
    level,
    stateName: !spec.map.states && spec.map.state ? spec.map.state : undefined,
    stateNames: spec.map.states,
    markers: spec.markers as MapMarker[] | undefined,
    routes: spec.routes as MapRoute[] | undefined,
    vector: basemap === "vector",
    tiles: basemap === "raster",
    boundaryTooltips: spec.options?.tooltip !== false,
    // Focused, single-region views clip to the chosen states for a clean map.
    clipToStates: spec.map.region !== "india" && !!focusStates?.length,
    // Framing: fit to markers/routes when present, else keep the India view.
    fitTo: (spec.markers?.length || spec.routes?.length) ? "data" : "india",
    // Bump so the choropleth overlay redraws when the data changes (no remount).
    dataKey: `${spec.visualization}:${spec.data?.length ?? 0}`,
  };
  if (hasData && level === "state") props.stateFill = (name) => fill(name);
  if (hasData && level === "district") props.districtFill = (name) => fill(name);
  return props;
}
