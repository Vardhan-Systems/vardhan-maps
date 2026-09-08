import { defineConfig } from "tsup";

// Four entry points, each a subpath export (see package.json "exports"):
//   .        → src/index.ts   (types + metadata, no data payload)
//   ./data   → the GeoJSON data + accessors (bundles the JSON)
//   ./svg    → the dependency-free SVG renderer
//   ./react  → the React components (react/leaflet stay external peer deps)
export default defineConfig({
  entry: {
    index: "src/index.ts",
    "data/index": "src/data/index.ts",
    "svg/index": "src/svg/index.ts",
    "react/index": "src/react/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Consumers bring their own React/Leaflet — never bundle them in.
  external: ["react", "react/jsx-runtime", "leaflet"],
});
