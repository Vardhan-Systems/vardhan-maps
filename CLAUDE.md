# CLAUDE.md

Project memory for `vardhan-maps`. Read this first; it captures the durable facts
that are not obvious from any single file.

## What this is

A npm package providing a **standard India map** — state + district boundaries
aligned to the official Government of India depiction — shipped three ways:

1. **GeoJSON data** (`vardhan-maps/data`) — 36 states/UTs + 787 districts.
2. **Dependency-free SVG renderer** (`vardhan-maps/svg`).
3. **React renderers** (`vardhan-maps/react`) — SVG or Leaflet/MapLibre — and a
   **React Native** renderer (`vardhan-maps/react-native`).

Plus an optional **self-hosted light-grey vector basemap** (roads + labels, no
POI) served from Cloudflare R2, zero-config via a default tiles origin.

> Not an official or survey-grade map. Boundaries are a best-effort approximation
> of the GoI depiction, derived from OpenStreetMap and editorially corrected.
> Code is MIT; **map data is ODbL** — any product must credit
> "© OpenStreetMap contributors". See `ATTRIBUTION.md`.

## Entry points (subpath exports)

The root entry carries **no map data** (types/metadata only, stays tiny). Import
payloads from subpaths:

| Export | Source | What it gives |
|---|---|---|
| `.` | `src/index.ts` | types + `VERSION` metadata, no data |
| `./data` | `src/data/index.ts` | GeoJSON + accessors (`getStates`, `loadDistricts`, …) |
| `./svg` | `src/svg/index.ts` | `renderIndiaSvg()` — dependency-free SVG string |
| `./react` | `src/react/index.ts` | `<IndiaMap mode="svg" \| "leaflet" />`, Leaflet map, vector basemap |
| `./react-native` | `src/react-native/index.ts` | native MapLibre renderer |
| `./spec` | `src/spec/index.ts` | `VardhanMapSpec` contract + renderers (AI/tool-friendly) |

All peer deps are **optional** — consumers install only what their chosen
renderer needs (`leaflet`, `maplibre-gl`, `pmtiles`, `react`, `react-native`,
`@maplibre/*`, `topojson-*`).

## Source layout

- `src/data/` — accessors + `generated/` (the shipped dataset; see pipeline below).
  States are **eager** (`states.low.json` bundled); **districts load lazily**, one
  code-split ESM chunk per state per resolution (`districts/<res>/<slug>.js`).
- `src/svg/` — projection + path builder + renderer.
- `src/react/` — `IndiaMap`, `IndiaSvgMap`, `IndiaLeafletMap`, `vector.ts`
  (basemap style + `VARDHAN_TILES_ORIGIN`), `border-mesh.ts`.
- `src/react-native/` — `IndiaMapNative` + geometry helpers.
- `src/spec/` — the declarative spec → props/SVG, color scales.
- `src/core/geo.ts` — shared geo utilities.

Two **resolution tiers**: `low` (default, overview, RDP tol 0.01) and `high`
(zoomed-in, tol 0.003).

## Build & test

ESM-only build via **tsup** (`src/*/index.ts` → `dist/`). Code-splitting is on so
the lazy district `import()`s stay separate chunks — this is **why the package is
ESM-only** (CJS would inline everything and defeat lazy loading).

```bash
pnpm build        # tsup → dist/
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run   (tests in test/)
```

Package manager is **pnpm** (v11; single-package repo, `pnpm-workspace.yaml`
carries settings). Conventional-commit messages (`feat:`, `fix:`, `chore:`…).

## Boundary data pipeline (regenerating the GeoJSON)

Source: OpenStreetMap via the **Overpass** API (`admin_level=4` states,
`admin_level=5` districts). Rarely needs re-running — the output is committed
under `src/data/generated/`.

```bash
pnpm data:fetch       # scripts/fetch-osm.mjs  → data/raw/ (resumable, multi-mirror)
pnpm data:overrides   # scripts/make-goi-overrides.mjs → data/overrides/ (J&K, Ladakh)
pnpm data:build       # scripts/build-data.mjs → src/data/generated/
```

GoI depiction is produced by **unioning** OSM-sourced claimed regions onto the
India-side state: J&K += PoK (Azad Kashmir); Ladakh += Gilgit-Baltistan + Aksai
Chin. Overrides live in `data/overrides/*.geojson`. `scripts/lib/` holds the RDP
simplifier, state-assignment, and GoI patch helpers.

## Vector basemap tiles pipeline (the monthly refresh) — IMPORTANT

The self-hosted basemap (`transportation`/roads, water, labels…) is **rebuilt
monthly from current OSM data** and uploaded to Cloudflare R2, independent of any
package release.

- **Workflow:** `.github/workflows/refresh-tiles.yml` — cron `0 3 1 * *` (03:00
  UTC on the 1st of each month) + manual `workflow_dispatch`. GitHub often delays
  scheduled runs by hours; that is normal.
- **Build script:** `scripts/build-tiles.sh` — Geofabrik India extract → `osmium`
  clip to the Telangana + Andhra Pradesh bbox (`76.6,12.5,85.0,20.0`) →
  **Planetiler** (OpenMapTiles schema) → `beyond-tgap.pmtiles`.
- **Output:** R2 bucket `beyond-basemap`, object `beyond-tgap.pmtiles`, served at
  **`https://maps.vardhansystems.in/beyond-tgap.pmtiles`** (the default
  `VARDHAN_TILES_ORIGIN` in `src/react/vector.ts`). Uploaded with
  `Cache-Control: no-store` so the CDN never caches a partially-updated file read
  via HTTP range requests. CORS is open (`*`), range requests supported.
- **Secrets required:** `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`.

**Operational gotchas:**
- **Geofabrik downloads are flaky** — the OSM data servers return transient
  redirect loops / connection resets. The Oct 2026 scheduled run failed this way
  (`curl: (47) Maximum redirects followed`). `dl()` in `build-tiles.sh` is
  hardened against it: descriptive User-Agent, `--max-redirs 10`, and an outer
  retry loop that validates a minimum downloaded size before accepting the file.
  The root cause is upstream and intermittent, not our code — a plain re-run
  usually succeeds.
- **The cron only runs from `main`.** A fix on a branch does not affect the
  scheduled run until merged.
- GitHub **auto-disables scheduled workflows after 60 days of repo inactivity**
  (it emails to re-enable). Keep the repo active or re-enable when prompted.

## Previewing the map

- **Raw basemap tiles** (what the cron produces), no build needed — PMTiles viewer:
  `https://pmtiles.io/#url=https%3A%2F%2Fmaps.vardhansystems.in%2Fbeyond-tgap.pmtiles`
- **The full product** (boundaries + basemap) — the Vite demo:
  ```bash
  pnpm --dir examples/demo dev        # http://localhost:5173
  ```
  Its `vite.config.ts` aliases `vardhan-maps/*` to `src/` (no build needed).
  Gotcha: Vite reads the root `package.json`, which marks `leaflet` (and other
  peers) **optional**, so it stubs them and the map renders blank. Fix by adding
  the runtime peers to the demo's `optimizeDeps.include`
  (`leaflet`, `maplibre-gl`, `pmtiles`, `@maplibre/maplibre-gl-leaflet`) and
  clearing `examples/demo/node_modules/.vite`.

## Known doc drift (verify before trusting)

- `VERSION` in `src/index.ts` and `meta.json`'s own version lag `package.json`'s
  version — don't treat them as the release version.
- `README.md` still says "maplibre-gl v3/v4 only", but the peer range and recent
  work allow **v6** (`maplibre-gl ">=3 <5 || >=6.4.1"`).
