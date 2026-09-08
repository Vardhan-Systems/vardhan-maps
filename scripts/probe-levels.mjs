// Probe which admin_level holds DISTRICTS for a given state: prints count + a few
// names at levels 5,6,7 so we can pick the right level per state. Tags only (fast).
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const UA = "vardhan-maps/0.0.1 (district level probe)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function overpass(q, tries = 6) {
  let last;
  for (let a = 0; a < tries; a++) {
    try {
      const res = await fetch(ENDPOINTS[a % ENDPOINTS.length], {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
        body: "data=" + encodeURIComponent(q),
      });
      const t = await res.text();
      if (res.ok && t.trimStart().startsWith("{")) return JSON.parse(t);
      last = new Error(`HTTP ${res.status}: ${t.slice(0,80)}`);
    } catch (e) { last = e; }
    await sleep(4000 * (a + 1));
  }
  throw last;
}
const STATES = [
  ["Uttar Pradesh", 1942587],
  ["Assam", 2025886],
  ["Delhi", 1942586],
];
for (const [name, id] of STATES) {
  console.log(`\n=== ${name} (${id}) ===`);
  for (const lvl of [5, 6, 7]) {
    try {
      const osm = await overpass(
        `[out:json][timeout:120];relation["boundary"="administrative"]["admin_level"="${lvl}"](area:${3600000000 + id});out tags;`,
      );
      const names = osm.elements.filter((e) => e.tags).map((e) => e.tags["name:en"] || e.tags.name || "?");
      console.log(`L${lvl}: ${names.length}  e.g. ${names.slice(0, 8).join(", ")}`);
    } catch (e) { console.log(`L${lvl}: ERROR ${String(e).slice(0,70)}`); }
    await sleep(1500);
  }
}
