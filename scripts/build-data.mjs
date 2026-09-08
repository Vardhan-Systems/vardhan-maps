// Build the shipped dataset from the raw OSM dumps (data/raw/, produced by
// `pnpm data:fetch`): normalise names → assign districts to states → simplify →
// apply GoI border patches → write src/data/generated/{states,districts,meta}.json.
// Run: `pnpm data:build`. Tune tolerance with SIMPLIFY_TOLERANCE (degrees).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { simplifyGeometry } from "./lib/rdp.mjs";
import { centroidOf, stateAt } from "./lib/assign-state.mjs";
import { patchGoiBorders, DISPUTED_STATES } from "./lib/patch.mjs";

const RAW = new URL("../data/raw/", import.meta.url).pathname;
const OVERRIDES = new URL("../data/overrides/", import.meta.url).pathname;
const OUT = new URL("../src/data/generated/", import.meta.url).pathname;
const TOLERANCE = Number(process.env.SIMPLIFY_TOLERANCE ?? 0.01);

function requireRaw(name) {
  const path = `${RAW}${name}`;
  if (!existsSync(path)) {
    console.error(`Missing ${path}. Run \`pnpm data:fetch\` first.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

const nameOf = (tags = {}) => tags["name:en"] || tags.name || "";
const onlyAreas = (f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon");

mkdirSync(OUT, { recursive: true });

// ── States ───────────────────────────────────────────────────────────────────
const rawStates = requireRaw("states.raw.geojson").features.filter(onlyAreas);
let states = rawStates.map((f) => ({
  type: "Feature",
  properties: { name: nameOf(f.properties) },
  geometry: simplifyGeometry(f.geometry, TOLERANCE),
}));

const patch = patchGoiBorders(states, OVERRIDES);
states = patch.features;
if (patch.applied.length) console.log(`[patch] applied GoI override: ${patch.applied.join(", ")}`);
if (patch.missing.length) console.log(`[patch] NO override yet (left as OSM): ${patch.missing.join(", ")}`);

// ── Districts (assign parent state by centroid) ───────────────────────────────
const rawDistricts = requireRaw("districts.raw.geojson").features.filter(onlyAreas);
const districts = rawDistricts.map((f) => {
  const geometry = simplifyGeometry(f.geometry, TOLERANCE);
  const c = centroidOf(geometry);
  const state = c ? stateAt(c[0], c[1], states) : "";
  return { type: "Feature", properties: { name: nameOf(f.properties), state }, geometry };
});
const orphans = districts.filter((d) => !d.properties.state).length;
if (orphans) console.log(`[build] ${orphans} districts could not be matched to a state (check simplification).`);

// ── Write ─────────────────────────────────────────────────────────────────────
const write = (name, obj) => writeFileSync(`${OUT}${name}`, JSON.stringify(obj));
write("states.json", { type: "FeatureCollection", features: states });
write("districts.json", { type: "FeatureCollection", features: districts });
write("meta.json", {
  version: process.env.DATA_VERSION ?? "0.1.0",
  generated: new Date().toISOString().slice(0, 10),
  source: "OpenStreetMap via Overpass (admin_level=4/5), osmtogeojson, Douglas–Peucker simplified",
  simplifyToleranceDeg: TOLERANCE,
  goiBordersPatched: patch.patched,
  note: patch.patched
    ? "Full India. GoI disputed-border overrides applied. Not an official/survey map."
    : `Full India. GoI overrides still MISSING for: ${DISPUTED_STATES.join(", ")}. Not an official/survey map.`,
  stateCount: states.length,
  districtCount: districts.length,
});
console.log(`[build] states=${states.length} districts=${districts.length} → ${OUT}`);
