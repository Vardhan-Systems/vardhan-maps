// Generate the README hero image: a clean India state map rendered BY the library
// itself (crisp vector SVG, no browser needed). Run after `pnpm build`:
//   node scripts/gen-hero.mjs
import { renderIndiaSvg } from "../dist/svg/index.js";
import { mkdirSync, writeFileSync } from "node:fs";

// A cohesive cool ramp (blue → teal → green) so the map reads as one palette,
// not a random rainbow. Deterministic per state name → stable output.
const ramp = ["#1e3a8a", "#1d4ed8", "#2563eb", "#0ea5e9", "#06b6d4", "#14b8a6", "#10b981"];
const hash = (s) => {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};
const colorFor = (name) => ramp[hash(name) % ramp.length];

const svg = renderIndiaSvg({
  level: "state",
  width: 1000,
  height: 1000,
  padding: 28,
  titles: false,
  stateStyle: { stroke: "#ffffff", strokeWidth: 1.4 },
  stateFill: (name) => colorFor(name),
});

mkdirSync("docs/assets", { recursive: true });
writeFileSync("docs/assets/hero.svg", svg);
console.log(`wrote docs/assets/hero.svg (${svg.length} bytes)`);
