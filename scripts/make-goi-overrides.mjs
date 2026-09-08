// Generate the Government-of-India boundary overrides for Jammu & Kashmir and
// Ladakh. India's official depiction additionally claims:
//   • J&K   += Azad Kashmir (Pakistan-administered)
//   • Ladakh += Gilgit-Baltistan (Pakistan-administered) + Aksai Chin (China-administered)
// OSM already holds all of these as polygons, so we take the OSM India-side state
// (from data/raw/states.raw.geojson) and UNION the claimed regions onto it. Every
// coordinate is OSM-sourced (ODbL); the result is the GoI *depiction*, still an
// approximation — see ATTRIBUTION.md. Run: `node scripts/make-goi-overrides.mjs`.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import polygonClipping from "polygon-clipping";
import { simplifyGeometry } from "./lib/rdp.mjs";

const RAW = new URL("../data/raw/", import.meta.url).pathname;
const OUT = new URL("../data/overrides/", import.meta.url).pathname;
const UA = "vardhan-maps/0.0.1 (India map data pipeline; +https://github.com/vardhansystems/vardhan-maps)";
const TOL = Number(process.env.SIMPLIFY_TOLERANCE ?? 0.01);
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const nm = (p = {}) => p["name:en"] || p.name || "";

function vtx(geom) {
  const rings = geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
  return rings.reduce((n, r) => n + r.length, 0);
}
function toMP(geom) {
  return geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
}
function unionAll(geoms) {
  const mps = geoms.map(toMP);
  return { type: "MultiPolygon", coordinates: polygonClipping.union(mps[0], ...mps.slice(1)) };
}

/** Largest OSM India-side polygon for `name` from the raw states dump. */
function baseState(name) {
  const raw = JSON.parse(readFileSync(`${RAW}states.raw.geojson`, "utf8"));
  let best = null;
  for (const f of raw.features) {
    if (nm(f.properties) !== name) continue;
    if (!f.geometry?.type?.includes("Polygon")) continue;
    if (!best || vtx(f.geometry) > vtx(best)) best = f.geometry;
  }
  if (!best) throw new Error(`No OSM geometry for state "${name}" in states.raw.geojson`);
  return best;
}

/** A named region's polygon from Nominatim (OSM). */
async function nominatim(q) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=1&q=" +
    encodeURIComponent(q);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const arr = await res.json();
  const g = arr?.[0]?.geojson;
  await sleep(1200); // Nominatim policy: ≤1 req/s
  if (!g || !g.type?.includes("Polygon")) throw new Error(`no polygon for "${q}"`);
  return g;
}

async function tryRegion(q) {
  try {
    const g = await nominatim(q);
    console.log(`[goi] + ${q}`);
    return g;
  } catch (e) {
    console.log(`[goi] ! skipped ${q}: ${String(e).slice(0, 60)}`);
    return null;
  }
}

async function writeOverride(stateName, extras) {
  const parts = [baseState(stateName), ...extras.filter(Boolean)];
  const merged = simplifyGeometry(unionAll(parts), TOL);
  const feature = { type: "Feature", properties: { name: stateName, goiClaim: true }, geometry: merged };
  const path = `${OUT}${slug(stateName)}.geojson`;
  writeFileSync(path, JSON.stringify(feature));
  console.log(`[goi] wrote ${path} (${extras.filter(Boolean).length}/${extras.length} claimed regions merged)`);
}

const azad = await tryRegion("Azad Kashmir, Pakistan");
const gb = await tryRegion("Gilgit-Baltistan, Pakistan");
const aksai = await tryRegion("Aksai Chin");

await writeOverride("Jammu and Kashmir", [azad]);
await writeOverride("Ladakh", [gb, aksai]);
console.log("[goi] done. Re-run `pnpm data:build` to apply.");
