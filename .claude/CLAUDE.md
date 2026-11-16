# Project memory — vardhan-maps

The durable facts about this repo that are not obvious from any single file.
(The root `CLAUDE.md` imports this file so it is auto-loaded.)

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

Package manager is **pnpm** (v11 locally; **CI pins pnpm 9** — see CI note below).
Single-package repo; `pnpm-workspace.yaml` carries settings and must keep a
`packages: ["."]` field or pnpm 9 errors. Conventional-commit messages
(`feat:`, `fix:`, `chore:`…).

## CI

`.github/workflows/ci.yml` runs on PRs to `main`: `pnpm install --frozen-lockfile`
→ `typecheck` → `test` → `build`, on **pnpm 9** (`pnpm/action-setup version: 9`).
Because CI is pnpm 9 while the repo targets pnpm 11, `pnpm-workspace.yaml` must
include a `packages:` field (pnpm 9 fails `pnpm store path` with "packages field
missing or empty" without it — this broke CI once and is now fixed).

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

## Vector basemap tiles pipeline (PER-STATE) — IMPORTANT

The self-hosted basemap (`transportation`/roads, water, labels…) is built **one
`.pmtiles` per state** from current OSM data and uploaded to Cloudflare R2,
independent of any package release. Each state builds small enough for the free
GitHub Actions runner, so coverage extends across India one state at a time.

- **Workflow:** `.github/workflows/refresh-tiles.yml` — cron `0 3 1 * *` (03:00
  UTC on the 1st of each month) + manual `workflow_dispatch` with a `state` input.
  The scheduled run (no input) rebuilds the original Telangana + Andhra Pradesh
  set; `workflow_dispatch` with e.g. `state=Karnataka` builds that one state.
  GitHub often delays scheduled runs by hours; that is normal. Build one on demand:
  `gh workflow run refresh-tiles.yml --ref <branch> -f state="Karnataka"`.
- **Build script:** `scripts/build-tiles.sh [workdir] [state]` — India extract →
  `osmium` clip to the state's bbox → **Planetiler** (OpenMapTiles schema) →
  `beyond-<slug>.pmtiles`. No state arg = the TG+AP set (`beyond-tgap.pmtiles`).
- **Bbox helper:** `scripts/state-tiles-meta.mjs "<state>"` prints `SLUG`/`BBOX`/`OUT`,
  derived from the shipped boundary data (`states.low.json`) — no hardcoded bboxes.
- **Output:** R2 bucket `beyond-basemap`, objects `beyond-<slug>.pmtiles`, served at
  `https://maps.vardhansystems.in/beyond-<slug>.pmtiles` (origin =
  `VARDHAN_TILES_ORIGIN` in `src/react/vector.ts`). Uploaded `Cache-Control:
  no-store` so the CDN never caches a partially-updated file read via HTTP range
  requests. CORS open (`*`), range requests supported. (Object/bucket naming kept
  as `beyond-*` for now — a rename to `vardhan-*` was deferred.)
- **Secrets required:** `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`.

**Renderer selection (`src/react/vector.ts`):** `HOSTED_STATE_TILES` maps a state
slug → its `.pmtiles`; `stateTilesUrl(name)` resolves the URL. The Leaflet
(`IndiaLeafletMap`) and React Native (`IndiaMapNative`) renderers auto-pick the
focused state's own tiles when `vector` is on and `stateName` is set; unhosted
states fall back to the default TG+AP set. **Add a state's slug to
`HOSTED_STATE_TILES` only after its tiles are published**, and keep the
`test/vector.test.ts` unhosted-case assertions synthetic (not real states).

**Coverage so far (Nov 2026):** TG+AP (`beyond-tgap`), Karnataka, Tamil Nadu,
Kerala, Maharashtra, Gujarat. ~29 states/UTs remain; add them one at a time.

**Operational gotchas:**
- **Geofabrik is flaky** — it both returns redirect loops (the Oct 2026 cron:
  `curl (47): Maximum redirects followed`) and refuses connections entirely (the
  Nov 2026 Maharashtra/Gujarat builds: `curl (7): Failed to connect`). `dl()` in
  `build-tiles.sh` hardens each fetch (User-Agent, `--max-redirs 10`, retry loop
  with min-size validation), and `dl_any()` falls back from Geofabrik to the **OSM
  France mirror** (`download.openstreetmap.fr/extracts/asia/india.osm.pbf`). Root
  cause is upstream and intermittent — a plain re-run usually succeeds.
- **The cron only runs from `main`.** A branch fix doesn't affect the schedule
  until merged.
- GitHub **auto-disables scheduled workflows after 60 days of repo inactivity**
  (it emails to re-enable).
- When scripting a watch, read the run's real conclusion
  (`gh run view <id> --json conclusion`) — a background watcher's exit code can
  reflect the last piped command, not the run.

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
