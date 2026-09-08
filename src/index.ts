/**
 * vardhan-maps — a standard India map (state + district boundaries) built on
 * OpenStreetMap.
 *
 * The main entry deliberately carries NO map data (so importing types/metadata
 * stays tiny). Import from the subpaths for the payloads:
 *   - `vardhan-maps/data`  → GeoJSON + accessors (getStates/getDistricts/…)
 *   - `vardhan-maps/svg`   → renderIndiaSvg() (dependency-free SVG string)
 *   - `vardhan-maps/react` → <IndiaMap mode="svg" | "leaflet" />
 */
export type {
  StateProps,
  DistrictProps,
  StateFeature,
  DistrictFeature,
  StateCollection,
  DistrictCollection,
  StateGeometry,
  DatasetMeta,
} from "./data/types";
export type { Resolution } from "./data";

export const VERSION = "0.3.0";
