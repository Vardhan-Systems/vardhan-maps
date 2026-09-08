// Apply the Government-of-India depiction to the disputed segments.
//
// OSM's default data does not draw these the official-India way. We correct them
// by REPLACING the affected state features with hand-curated override geometry
// placed in data/overrides/<slug>.geojson (a single GeoJSON Feature/geometry).
// Until an override exists for a disputed state, that state is left as-is and the
// dataset is marked goiBordersPatched=false. See ATTRIBUTION.md for the caveat.

import { existsSync, readFileSync } from "node:fs";

/** States whose depiction differs between OSM and the official GoI map. */
export const DISPUTED_STATES = ["Jammu and Kashmir", "Ladakh", "Arunachal Pradesh"];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * @returns {{ features: any[], patched: boolean, applied: string[], missing: string[] }}
 */
export function patchGoiBorders(features, overridesDir) {
  const applied = [];
  const missing = [];
  const out = features.map((f) => {
    const name = f.properties?.name ?? "";
    if (!DISPUTED_STATES.includes(name)) return f;
    const path = `${overridesDir}${slug(name)}.geojson`;
    if (!existsSync(path)) { missing.push(name); return f; }
    const override = JSON.parse(readFileSync(path, "utf8"));
    const geometry = override.type === "Feature" ? override.geometry : override;
    applied.push(name);
    return { ...f, geometry };
  });
  return { features: out, patched: missing.length === 0, applied, missing };
}
