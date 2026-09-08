import { defineConfig } from "tsup";

// Four entry points, each a subpath export (see package.json "exports"):
//   .        → src/index.ts   (types + metadata, no data payload)
//   ./data   → GeoJSON + accessors; districts load lazily as code-split chunks
//   ./svg    → the dependency-free SVG renderer
//   ./react  → the React components (react/leaflet stay external peer deps)
//
// ESM-only: esbuild code-splits `import()` (the lazy per-state district chunks)
// for ESM but would inline everything into a single CJS file, defeating lazy
// loading — so we ship ESM only. Node CJS users can still `await import()`.
export default defineConfig({
  entry: {
    index: "src/index.ts",
    "data/index": "src/data/index.ts",
    "svg/index": "src/svg/index.ts",
    "react/index": "src/react/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: true, // per-state district chunks
  sourcemap: false,
  treeshake: true,
  external: ["react", "react/jsx-runtime", "leaflet"],
});
