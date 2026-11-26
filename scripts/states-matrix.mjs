// Emit `matrix=<json array of state names>` for the refresh-tiles workflow, which
// builds one tile set per array entry (in parallel). Reads two env vars:
//   STATES — comma-separated state names to build in parallel, or "all" (every
//            state/UT from the shipped boundary data). Takes precedence.
//   STATE  — a single state name (the existing single-build input).
// Precedence: STATES > STATE > [""] — the empty string is the default
// Telangana + Andhra Pradesh set, so the monthly cron (no inputs) rebuilds it.
//
// Output is a `KEY=value` line for $GITHUB_OUTPUT. Reads only the committed dataset.
import { readFileSync } from "node:fs";

const STATES = (process.env.STATES ?? "").trim();
const STATE = (process.env.STATE ?? "").trim();

let list;
if (STATES.toLowerCase() === "all") {
  const fc = JSON.parse(
    readFileSync(new URL("../src/data/generated/states.low.json", import.meta.url), "utf8"),
  );
  list = fc.features.map((f) => f.properties.name).sort();
} else if (STATES) {
  list = STATES.split(",").map((s) => s.trim()).filter(Boolean);
} else if (STATE) {
  list = [STATE];
} else {
  list = [""]; // monthly cron default → beyond-tgap.pmtiles
}

process.stdout.write(`matrix=${JSON.stringify(list)}\n`);
