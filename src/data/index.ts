import statesLow from "./generated/states.low.json";
import metaJson from "./generated/meta.json";
import slugsJson from "./generated/slugs.json";
import { loaders as lowLoaders } from "./generated/districts/low";
import { loaders as highLoaders } from "./generated/districts/high";
import type {
  DatasetMeta,
  DistrictCollection,
  DistrictFeature,
  StateCollection,
  StateFeature,
} from "./types";

export * from "./types";

/** Resolution tiers: `low` (default, overview) and `high` (zoomed-in detail). */
export const RESOLUTIONS = ["low", "high"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

/** State / UT boundaries at the default (low) resolution — eagerly bundled. */
export const states: StateCollection = statesLow as unknown as StateCollection;

/** How the bundled dataset was produced (see ATTRIBUTION.md). */
export const meta: DatasetMeta = metaJson as DatasetMeta;

/** Every state's canonical name + slug (the key for the district loaders). */
export const stateList: { name: string; slug: string }[] = slugsJson as { name: string; slug: string }[];

const LOADERS: Record<Resolution, Record<string, () => Promise<{ default: DistrictCollection }>>> = {
  low: lowLoaders,
  high: highLoaders,
};

const norm = (s: string) => s.trim().toLowerCase();
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Every state / UT feature (low resolution). */
export function getStates(): StateFeature[] {
  return states.features;
}

/** One state / UT by (case-insensitive) name, or `undefined`. */
export function getState(name: string): StateFeature | undefined {
  const n = norm(name);
  return states.features.find((f) => norm(f.properties.name) === n);
}

/** The district-loader slug for a state name (accepts name or slug), or undefined. */
export function stateSlug(name: string): string | undefined {
  const target = slugify(name);
  return stateList.find((s) => s.slug === target || norm(s.name) === norm(name))?.slug;
}

/** Load higher-resolution state boundaries on demand (`low` is already bundled). */
export async function loadStates(resolution: Resolution = "low"): Promise<StateCollection> {
  if (resolution === "low") return states;
  const mod = await import("./generated/states.high.json");
  return ((mod as { default?: unknown }).default ?? mod) as StateCollection;
}

/** Lazily load ONE state's districts (its own code-split chunk). */
export async function loadDistricts(
  stateName: string,
  opts: { resolution?: Resolution } = {},
): Promise<DistrictFeature[]> {
  const res = opts.resolution ?? "low";
  const slug = stateSlug(stateName);
  const load = slug ? LOADERS[res][slug] : undefined;
  if (!load) throw new Error(`vardhan-maps: no districts for state "${stateName}" (resolution "${res}")`);
  return (await load()).default.features as DistrictFeature[];
}

/** Lazily load ALL districts at a resolution (loads every per-state chunk). */
export async function loadAllDistricts(
  opts: { resolution?: Resolution } = {},
): Promise<DistrictCollection> {
  const res = opts.resolution ?? "low";
  const parts = await Promise.all(
    Object.values(LOADERS[res]).map((l) => l().then((m) => m.default.features as DistrictFeature[])),
  );
  return { type: "FeatureCollection", features: parts.flat() };
}
