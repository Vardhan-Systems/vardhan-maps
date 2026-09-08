// Build the shipped dataset from the raw OSM dumps (data/raw/, produced by
// `pnpm data:fetch`): dedupe + normalise → assign districts to states → simplify
// → apply GoI border patches → write src/data/generated/{states,districts,meta}.json.
// Run: `pnpm data:build`. Tune tolerance with SIMPLIFY_TOLERANCE (degrees).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { simplifyGeometry } from "./lib/rdp.mjs";
import { pointOnSurface, stateAt, stateByVertexMajority } from "./lib/assign-state.mjs";
import { patchGoiBorders, DISPUTED_STATES } from "./lib/patch.mjs";

const RAW = new URL("../data/raw/", import.meta.url).pathname;
const OVERRIDES = new URL("../data/overrides/", import.meta.url).pathname;
const OUT = new URL("../src/data/generated/", import.meta.url).pathname;
const TOLERANCE = Number(process.env.SIMPLIFY_TOLERANCE ?? 0.01);

// Relations that leak in from the India area query but are not Indian states.
const DENYLIST = new Set(["Rangpur Division"]);

const nameOf = (tags = {}) => tags["name:en"] || tags.name || "";
const onlyAreas = (f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon");

function vertexCount(geom) {
  let n = 0;
  const rings = geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
  for (const r of rings) n += r.length;
  return n;
}

/** Keep one feature per key — the one with the most vertices (the real boundary). */
function dedupeByName(features, keyFn) {
  const best = new Map();
  for (const f of features) {
    const key = keyFn(f);
    if (!key) continue;
    const cur = best.get(key);
    if (!cur || vertexCount(f.geometry) > vertexCount(cur.geometry)) best.set(key, f);
  }
  return [...best.values()];
}

function readRaw(name) {
  const path = `${RAW}${name}`;
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

mkdirSync(OUT, { recursive: true });

// ── States ───────────────────────────────────────────────────────────────────
const rawStates = readRaw("states.raw.geojson");
if (!rawStates) {
  console.error("Missing data/raw/states.raw.geojson — run `pnpm data:fetch states` first.");
  process.exit(1);
}
let states = dedupeByName(
  rawStates.features.filter(onlyAreas).filter((f) => !DENYLIST.has(nameOf(f.properties))),
  (f) => nameOf(f.properties),
).map((f) => ({
  type: "Feature",
  properties: { name: nameOf(f.properties) },
  geometry: simplifyGeometry(f.geometry, TOLERANCE),
}));
states.sort((a, b) => a.properties.name.localeCompare(b.properties.name));

const patch = patchGoiBorders(states, OVERRIDES);
states = patch.features;
if (patch.applied.length) console.log(`[patch] applied GoI override: ${patch.applied.join(", ")}`);
if (patch.missing.length) console.log(`[patch] NO override yet (left as OSM): ${patch.missing.join(", ")}`);

// ── Districts (optional until fetched) ────────────────────────────────────────
const rawDistricts = readRaw("districts.raw.geojson");
let districts = [];
if (rawDistricts) {
  // Assign the parent state FIRST, then dedupe by name+state — several district
  // names recur across states (Aurangabad, Hamirpur, Pratapgarh, …), so keying on
  // name alone would wrongly drop the real ones.
  const feats = rawDistricts.features.filter(onlyAreas).map((f) => {
    const geometry = simplifyGeometry(f.geometry, TOLERANCE);
    // A guaranteed-interior point resolves to the right state even for concave
    // border districts; fall back to a vertex-majority vote if it still misses.
    const p = pointOnSurface(geometry);
    let state = p ? stateAt(p[0], p[1], states) : "";
    if (!state) state = stateByVertexMajority(geometry, states);
    return { type: "Feature", properties: { name: nameOf(f.properties), state }, geometry };
  });
  districts = dedupeByName(feats, (f) => `${f.properties.name}|${f.properties.state}`);
  const orphans = districts.filter((d) => !d.properties.state).length;
  if (orphans) console.log(`[build] ${orphans} districts unmatched to a state (check simplification).`);
} else {
  console.log("[build] no districts.raw yet — building STATES only. Run `pnpm data:fetch districts`.");
}

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
    : `Full India. GoI overrides MISSING for: ${DISPUTED_STATES.join(", ")}. Not an official/survey map.`,
  stateCount: states.length,
  districtCount: districts.length,
});
console.log(`[build] states=${states.length} districts=${districts.length} → ${OUT}`);
