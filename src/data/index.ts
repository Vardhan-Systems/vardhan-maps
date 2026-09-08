import statesJson from "./generated/states.json";
import districtsJson from "./generated/districts.json";
import metaJson from "./generated/meta.json";
import type {
  DatasetMeta,
  DistrictCollection,
  DistrictFeature,
  StateCollection,
  StateFeature,
} from "./types";

export * from "./types";

/** All state / union-territory boundaries as a GeoJSON FeatureCollection. */
export const states: StateCollection = statesJson as unknown as StateCollection;

/** All district boundaries as a GeoJSON FeatureCollection. */
export const districts: DistrictCollection = districtsJson as unknown as DistrictCollection;

/** How the bundled dataset was produced (see ATTRIBUTION.md). */
export const meta: DatasetMeta = metaJson as DatasetMeta;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Every state / UT feature. */
export function getStates(): StateFeature[] {
  return states.features;
}

/** One state / UT by (case-insensitive) name, or `undefined`. */
export function getState(name: string): StateFeature | undefined {
  const n = norm(name);
  return states.features.find((f) => norm(f.properties.name) === n);
}

/** District features — all of them, or only those within `stateName`. */
export function getDistricts(stateName?: string): DistrictFeature[] {
  if (!stateName) return districts.features;
  const n = norm(stateName);
  return districts.features.filter((f) => norm(f.properties.state) === n);
}
