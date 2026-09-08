// Fetch India's state (admin_level=4) and district (admin_level=5) boundaries
// from OpenStreetMap via the Overpass API and cache raw GeoJSON under data/raw/.
//
//   node scripts/fetch-osm.mjs states      # → data/raw/states.raw.geojson (+ index)
//   node scripts/fetch-osm.mjs districts   # → data/raw/districts.raw.geojson (per-state, RESUMABLE)
//   node scripts/fetch-osm.mjs all         # both (default)
//
// Districts are fetched one state at a time and cached to data/raw/districts/<id>.geojson,
// so a re-run SKIPS states already done — resilient to the public endpoint rate-limiting
// mid-run. Multiple Overpass mirrors are tried in turn. Data © OpenStreetMap
// contributors (ODbL). Set OVERPASS_URL to force a single endpoint.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import osmtogeojson from "osmtogeojson";

const ENDPOINTS = process.env.OVERPASS_URL
  ? [process.env.OVERPASS_URL]
  : [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ];
const UA = "vardhan-maps/0.0.1 (India map data pipeline; +https://github.com/vardhansystems/vardhan-maps)";
const RAW = new URL("../data/raw/", import.meta.url).pathname;
const DDIR = `${RAW}districts/`;
const INDIA_AREA = 3600304716; // relation India (304716) + 3.6e9
mkdirSync(DDIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(q, tries = 4) {
  let lastErr;
  for (let attempt = 0; attempt < tries; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
        body: "data=" + encodeURIComponent(q),
      });
      const text = await res.text();
      if (res.ok && text.trimStart().startsWith("{")) return JSON.parse(text);
      lastErr = new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
    } catch (e) {
      lastErr = e;
    }
    await sleep(5000 * (attempt + 1)); // back off; rotates endpoint next try
  }
  throw lastErr;
}

async function fetchStates() {
  console.log("[fetch] states (admin_level=4) …");
  const osm = await overpass(
    `[out:json][timeout:600];area(${INDIA_AREA})->.in;` +
      `relation["boundary"="administrative"]["admin_level"="4"](area.in);out geom;`,
  );
  const gj = osmtogeojson(osm);
  writeFileSync(`${RAW}states.raw.geojson`, JSON.stringify(gj));
  const index = osm.elements
    .filter((e) => e.type === "relation" && e.tags)
    .map((e) => ({ id: e.id, name: e.tags["name:en"] || e.tags.name || "" }));
  writeFileSync(`${RAW}states-index.json`, JSON.stringify(index, null, 2));
  console.log(`[fetch] states: ${gj.features.length} features, ${index.length} relations`);
}

async function fetchDistricts() {
  const index = JSON.parse(readFileSync(`${RAW}states-index.json`, "utf8"));
  for (const [i, st] of index.entries()) {
    const file = `${DDIR}${st.id}.geojson`;
    if (existsSync(file)) { console.log(`[fetch] districts ${i + 1}/${index.length} ${st.name} … cached`); continue; }
    process.stdout.write(`[fetch] districts ${i + 1}/${index.length} ${st.name} … `);
    try {
      const osm = await overpass(
        `[out:json][timeout:300];` +
          `relation["boundary"="administrative"]["admin_level"="5"](area:${3600000000 + st.id});out geom;`,
      );
      const feats = osmtogeojson(osm).features.filter((f) => f.geometry?.type?.includes("Polygon"));
      writeFileSync(file, JSON.stringify({ type: "FeatureCollection", features: feats }));
      console.log(`${feats.length}`);
    } catch (e) {
      console.log(`FAILED (${String(e).slice(0, 60)}) — will retry next run`);
    }
    await sleep(2000);
  }
  // Concatenate every cached per-state file into the combined raw dump.
  const all = [];
  for (const f of readdirSync(DDIR).filter((n) => n.endsWith(".geojson"))) {
    for (const feat of JSON.parse(readFileSync(`${DDIR}${f}`, "utf8")).features) all.push(feat);
  }
  writeFileSync(`${RAW}districts.raw.geojson`, JSON.stringify({ type: "FeatureCollection", features: all }));
  console.log(`[fetch] districts total: ${all.length} (from ${readdirSync(DDIR).length} state files)`);
}

const mode = process.argv[2] ?? "all";
if (mode === "states" || mode === "all") await fetchStates();
if (mode === "districts" || mode === "all") await fetchDistricts();
console.log("[fetch] done. Next: pnpm data:build");
