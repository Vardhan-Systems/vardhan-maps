// Print the tile-build metadata for a state — its slug, bounding box, and output
// `.pmtiles` filename — derived from the boundary data this package already
// ships (src/data/generated/states.low.json), so the per-state basemap pipeline
// never hardcodes 36 bounding boxes.
//
//   node scripts/state-tiles-meta.mjs "Karnataka"
//     SLUG=karnataka
//     BBOX=74.05,11.55,78.63,18.48
//     OUT=beyond-karnataka.pmtiles
//
// With no argument (or "tgap") it emits the original Telangana + Andhra Pradesh
// combined tile set, so the existing monthly build is unchanged.
//
// Output is `KEY=value` lines, meant for `eval "$(node scripts/state-tiles-meta.mjs …)"`
// in build-tiles.sh and the GitHub workflow. Run with `node -I` is unnecessary —
// it reads only the committed dataset.
import { readFileSync } from "node:fs";

const PAD = 0.1; // degrees of padding around the state, so edge roads aren't clipped

// The original combined set (Telangana + Andhra Pradesh) — kept as the default so
// `beyond-tgap.pmtiles` and the monthly cron keep working exactly as before.
const TGAP = { slug: "tgap", bbox: "76.6,12.5,85.0,20.0", out: "beyond-tgap.pmtiles" };

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const norm = (s) => s.trim().toLowerCase();

function emit({ slug, bbox, out }) {
  process.stdout.write(`SLUG=${slug}\nBBOX=${bbox}\nOUT=${out}\n`);
}

const arg = (process.argv[2] ?? "").trim();
if (arg === "" || norm(arg) === "tgap") {
  emit(TGAP);
  process.exit(0);
}

const statesUrl = new URL("../src/data/generated/states.low.json", import.meta.url);
const fc = JSON.parse(readFileSync(statesUrl, "utf8"));

const feature = fc.features.find((f) => norm(f.properties?.name ?? "") === norm(arg));
if (!feature) {
  const names = fc.features.map((f) => f.properties?.name).sort();
  process.stderr.write(
    `state-tiles-meta: no state named ${JSON.stringify(arg)}.\nKnown states:\n  ${names.join("\n  ")}\n`,
  );
  process.exit(1);
}

// Walk every coordinate pair of a Polygon / MultiPolygon to get the bbox.
let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
const visit = (node) => {
  if (typeof node[0] === "number" && typeof node[1] === "number") {
    const [lng, lat] = node;
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
    return;
  }
  for (const child of node) visit(child);
};
visit(feature.geometry.coordinates);

const r = (n) => Number(n.toFixed(4));
const bbox = [r(minLng - PAD), r(minLat - PAD), r(maxLng + PAD), r(maxLat + PAD)].join(",");
const slug = slugify(feature.properties.name);
emit({ slug, bbox, out: `beyond-${slug}.pmtiles` });
