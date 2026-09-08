// Fetch India's state (admin_level=4) and district (admin_level=5) boundaries
// from OpenStreetMap via the Overpass API, convert the raw OSM to GeoJSON with
// osmtogeojson, and cache the result under data/raw/. Run: `pnpm data:fetch`.
//
// This is intentionally polite to the public Overpass endpoint (one request per
// level, generous timeout). For repeated/large runs, point OVERPASS_URL at your
// own instance. Data © OpenStreetMap contributors (ODbL).

import { mkdirSync, writeFileSync } from "node:fs";
import osmtogeojson from "osmtogeojson";

const OVERPASS_URL = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const RAW_DIR = new URL("../data/raw/", import.meta.url).pathname;
mkdirSync(RAW_DIR, { recursive: true });

// area 3600304716 == relation India (OSM id 304716) + 3600000000 offset.
const INDIA_AREA = 3600304716;

function query(adminLevel) {
  return `[out:json][timeout:600];
    area(${INDIA_AREA})->.in;
    relation["boundary"="administrative"]["admin_level"="${adminLevel}"](area.in);
    out geom;`;
}

async function fetchLevel(adminLevel, outName) {
  console.log(`[fetch] admin_level=${adminLevel} …`);
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query(adminLevel)),
  });
  if (!res.ok) throw new Error(`Overpass ${adminLevel} → HTTP ${res.status}`);
  const osm = await res.json();
  const geojson = osmtogeojson(osm);
  const path = `${RAW_DIR}${outName}`;
  writeFileSync(path, JSON.stringify(geojson));
  console.log(`[fetch] ${outName}: ${geojson.features.length} features → ${path}`);
}

await fetchLevel(4, "states.raw.geojson");
await fetchLevel(5, "districts.raw.geojson");
console.log("[fetch] done. Next: pnpm data:build");
