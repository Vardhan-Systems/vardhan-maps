// Build the shipped dataset from the raw OSM dumps (data/raw/, produced by
// `pnpm data:fetch`): dedupe + normalise → assign districts to states (from RAW
// geometry) → apply GoI patches → emit MULTI-RESOLUTION output:
//   src/data/generated/states.<res>.json          (eager: states.low is bundled)
//   src/data/generated/districts/<res>/<slug>.js   (lazy: one ESM module per state)
//   src/data/generated/districts/<res>/index.js    (a static loader map for code-splitting)
//   src/data/generated/{slugs,meta}.json
// Run: `pnpm data:build`.

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { simplifyGeometry } from "./lib/rdp.mjs";
import { pointOnSurface, stateAt, stateByVertexMajority } from "./lib/assign-state.mjs";
import { patchGoiBorders, DISPUTED_STATES } from "./lib/patch.mjs";

const RAW = new URL("../data/raw/", import.meta.url).pathname;
const OVERRIDES = new URL("../data/overrides/", import.meta.url).pathname;
const OUT = new URL("../src/data/generated/", import.meta.url).pathname;

// Named resolution tiers → Douglas–Peucker tolerance (degrees). `low` is the
// eager/default overview tier; `high` is for zoomed-in single-state detail.
const RESOLUTIONS = { low: 0.01, high: 0.003 };

const DENYLIST = new Set(["Rangpur Division"]); // Bangladesh, leaks from the India area query
const nameOf = (t = {}) => t["name:en"] || t.name || "";
const onlyAreas = (f) => f.geometry && /Polygon$/.test(f.geometry.type);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function vertexCount(geom) {
  const rings = geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
  return rings.reduce((n, r) => n + r.length, 0);
}
function dedupe(features, keyFn) {
  const best = new Map();
  for (const f of features) {
    const k = keyFn(f);
    if (!k) continue;
    const cur = best.get(k);
    if (!cur || vertexCount(f.geometry) > vertexCount(cur.geometry)) best.set(k, f);
  }
  return [...best.values()];
}
const readRaw = (name) => JSON.parse(readFileSync(`${RAW}${name}`, "utf8"));

// ── Raw states (deduped, GoI-patched) ────────────────────────────────────────
let rawStates = dedupe(
  readRaw("states.raw.geojson").features.filter(onlyAreas).filter((f) => !DENYLIST.has(nameOf(f.properties))),
  (f) => nameOf(f.properties),
).map((f) => ({ type: "Feature", properties: { name: nameOf(f.properties) }, geometry: f.geometry }));
rawStates.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
const patch = patchGoiBorders(rawStates, OVERRIDES);
rawStates = patch.features;

// ── Raw districts, assigned to a state from RAW geometry, deduped by name+state ─
const rawDistricts = dedupe(
  readRaw("districts.raw.geojson").features.filter(onlyAreas).map((f) => {
    const p = pointOnSurface(f.geometry);
    let state = p ? stateAt(p[0], p[1], rawStates) : "";
    if (!state) state = stateByVertexMajority(f.geometry, rawStates);
    return { type: "Feature", properties: { name: nameOf(f.properties), state }, geometry: f.geometry };
  }),
  (f) => `${f.properties.name}|${f.properties.state}`,
);
const unassigned = rawDistricts.filter((d) => !d.properties.state).length;
if (unassigned) console.log(`[build] WARN ${unassigned} districts unassigned to a state`);

const stateSlugs = rawStates.map((f) => ({ name: f.properties.name, slug: slugify(f.properties.name) }));

// ── Emit per resolution tier ─────────────────────────────────────────────────
rmSync(`${OUT}districts`, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// From src/data/generated/districts/<res>/index.d.ts → src/data/types.ts is ../../../
const dtsLoader = `import type { DistrictCollection } from "../../../types";
export type DistrictLoader = () => Promise<{ default: DistrictCollection }>;
export declare const loaders: Record<string, DistrictLoader>;
`;

for (const [res, tol] of Object.entries(RESOLUTIONS)) {
  const dir = `${OUT}districts/${res}/`;
  mkdirSync(dir, { recursive: true });

  // states.<res>.json
  const states = rawStates.map((f) => ({ ...f, geometry: simplifyGeometry(f.geometry, tol) }));
  writeFileSync(`${OUT}states.${res}.json`, JSON.stringify({ type: "FeatureCollection", features: states }));

  // one ESM module per state: districts/<res>/<slug>.js
  const present = [];
  for (const { name, slug } of stateSlugs) {
    const feats = rawDistricts
      .filter((d) => d.properties.state === name)
      .map((d) => ({ ...d, geometry: simplifyGeometry(d.geometry, tol) }));
    if (!feats.length) continue;
    present.push(slug);
    writeFileSync(`${dir}${slug}.js`, `export default ${JSON.stringify({ type: "FeatureCollection", features: feats })}\n`);
  }

  // static loader map (each specifier literal → bundlers code-split per state)
  const entries = present.map((s) => `  ${JSON.stringify(s)}: () => import("./${s}.js"),`).join("\n");
  writeFileSync(`${dir}index.js`, `export const loaders = {\n${entries}\n};\n`);
  writeFileSync(`${dir}index.d.ts`, dtsLoader);
  console.log(`[build] ${res}: ${states.length} states, ${present.length} district files (tol ${tol})`);
}

// ── Index + meta ─────────────────────────────────────────────────────────────
writeFileSync(`${OUT}slugs.json`, JSON.stringify(stateSlugs));
writeFileSync(`${OUT}meta.json`, JSON.stringify({
  version: process.env.DATA_VERSION ?? "0.2.0",
  generated: new Date().toISOString().slice(0, 10),
  source: "OpenStreetMap via Overpass (admin_level=4/5), Douglas–Peucker simplified",
  resolutions: Object.keys(RESOLUTIONS),
  defaultResolution: "low",
  goiBordersPatched: patch.patched,
  note: patch.patched
    ? "Full India, multi-resolution. GoI disputed-border overrides applied. Not an official/survey map."
    : `Full India. GoI overrides MISSING for: ${DISPUTED_STATES.join(", ")}. Not an official/survey map.`,
  stateCount: rawStates.length,
  districtCount: rawDistricts.length,
}, null, 2));
console.log(`[build] states=${rawStates.length} districts=${rawDistricts.length} tiers=${Object.keys(RESOLUTIONS).join(",")}`);
