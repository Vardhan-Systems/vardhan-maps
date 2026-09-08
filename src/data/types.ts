import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

/** A state / union-territory boundary. */
export interface StateProps {
  /** Canonical English name, e.g. "Telangana". */
  name: string;
  /** ISO 3166-2:IN style code where known, e.g. "IN-TG". */
  code?: string;
}

/** A district boundary. */
export interface DistrictProps {
  /** Canonical English district name, e.g. "Khammam". */
  name: string;
  /** Parent state / UT name, e.g. "Telangana". */
  state: string;
}

export type StateGeometry = Polygon | MultiPolygon;

export type StateFeature = Feature<StateGeometry, StateProps>;
export type DistrictFeature = Feature<StateGeometry, DistrictProps>;
export type StateCollection = FeatureCollection<StateGeometry, StateProps>;
export type DistrictCollection = FeatureCollection<StateGeometry, DistrictProps>;

/** Metadata describing how the bundled dataset was produced. */
export interface DatasetMeta {
  /** Dataset semver, independent of the package version. */
  version: string;
  /** ISO date the data was generated. */
  generated: string;
  /** Upstream source, always OpenStreetMap for now. */
  source: string;
  /** Available resolution tiers, e.g. ["low","high"]. */
  resolutions: string[];
  /** The tier bundled eagerly / used when none is specified. */
  defaultResolution: string;
  /** True once GoI disputed-border corrections have been applied. */
  goiBordersPatched: boolean;
  /** Human note about coverage / caveats. */
  note: string;
  stateCount: number;
  districtCount: number;
}
