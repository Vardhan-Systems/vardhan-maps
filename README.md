# vardhan-maps

A **standard India map** — state and district boundaries, aligned to the official
Government of India depiction — as **GeoJSON data**, dependency-free **SVG** and
**Leaflet/React** renderers, and an optional **self-hosted light-grey vector
basemap** (roads + labels, no POI icons) that works out of the box. Built on
OpenStreetMap.

> ⚠️ **Boundary disclaimer.** Boundaries are a best-effort approximation of the
> official GoI depiction, derived from OpenStreetMap and editorially corrected.
> **This is not an official or survey-grade map of India.** See
> [ATTRIBUTION.md](./ATTRIBUTION.md).

> ✅ **Status: v0.6, on npm.** Ships **all 36 states/UTs + 787 districts**,
> generated from OpenStreetMap, with GoI border patches (J&K includes PoK; Ladakh
> includes Gilgit-Baltistan + Aksai Chin). Two resolution tiers (`low`/`high`) +
> lazy per-state district loading; choropleth + tooltips; live-tracking markers &
> routes; and a self-hosted OSM **vector basemap**.

## Install

```bash
npm add vardhan-maps
# for the Leaflet renderer (peer deps):
npm add leaflet react
# for the vector basemap (peer deps):
npm add maplibre-gl@^4 @maplibre/maplibre-gl-leaflet pmtiles
```

> **maplibre-gl v3 or v4 only** — v5+ is not yet compatible with the pmtiles source
> loading through the Leaflet adapter.

The package ships four independent entry points (`.` / `/data` / `/svg` / `/react`),
so you only pull what you use. All peers are **optional** — you only need them for
the renderer/basemap you actually use.

## Use the data

**States are eager** (bundled, tiny). **Districts load lazily**, per state, at a
resolution you choose — `"low"` (default, overview) or `"high"` (zoomed-in detail):

```ts
import {
  states, getState, getStates,   // eager states (low res)
  loadDistricts, loadAllDistricts, loadStates,
  meta, RESOLUTIONS,
} from "vardhan-maps/data";

states.features.length;                         // 36 states/UTs, no async
getState("Andhra Pradesh");                     // StateFeature | undefined

await loadDistricts("Telangana");               // just this state's chunk (low)
await loadDistricts("Kerala", { resolution: "high" });
await loadAllDistricts();                        // every district (787), low res
await loadStates("high");                        // higher-detail state outlines

meta.resolutions;                                // ["low","high"]
meta.goiBordersPatched;                          // true
```

Only the chunks you request are fetched, so a country overview stays lightweight
while a single-state drill-in can pull `high` detail on demand. Every feature is
standard GeoJSON — drop it into Leaflet, D3, MapLibre, Mapbox, turf, etc.
Properties: states `{ name, code? }`, districts `{ name, state }`.

## Render an SVG (dependency-free)

States render with no async; for districts, pass data you've loaded:

```ts
import { renderIndiaSvg } from "vardhan-maps/svg";
import { loadAllDistricts } from "vardhan-maps/data";

// State choropleth (no district data needed):
renderIndiaSvg({ level: "state", stateFill: (n) => (n === "Telangana" ? "#2563eb" : "#e2e8f0") });

// District map — pass loaded districts:
const districts = await loadAllDistricts();
renderIndiaSvg({ level: "both", districts, width: 900, height: 1000 });
// → "<svg …>…</svg>"
```

## React

The components lazy-load districts for you — just pass `resolution`:

```tsx
import { IndiaMap } from "vardhan-maps/react";
import "leaflet/dist/leaflet.css"; // only if you use mode="leaflet"

// Tile-less inline SVG (default); districts fetched on demand:
<IndiaMap level="both" resolution="low" onDistrictClick={(name) => console.log(name)} />

// One state's districts at high detail:
<IndiaMap level="district" stateName="Kerala" resolution="high" />

// Leaflet slippy map with OSM tiles:
<IndiaMap mode="leaflet" level="both" style={{ height: 520 }} />
```

`IndiaSvgMap` and `IndiaLeafletMap` are also exported directly. Both support
`level`, `stateName`, `resolution`, per-feature styling, choropleth `fill` hooks,
and click handlers.

**Tooltips.** `IndiaSvgMap` (and `IndiaMap` in SVG mode) takes a `tooltip` prop:
`tooltip` (boolean) shows the feature name; a function returns custom content:

```tsx
<IndiaMap
  level="state"
  tooltip={(c) => <b>{c.name} · {(c.props as { code?: string }).code}</b>}
/>
```

State properties include the **ISO 3166-2:IN `code`** (e.g. `IN-KL`, `IN-TG`).

**Leaflet mode** (`IndiaMap mode="leaflet"` / `IndiaLeafletMap`) adds a real OSM
basemap (cities, roads, terrain) under the boundaries and, by default, keeps the
view **India-only**: `lockToIndia` (hard pan/zoom bounds) and `mask` (greys out
everything outside India) are on unless you disable them. It also supports:

```tsx
<IndiaMap
  mode="leaflet"
  level="both"
  labels               // permanent state/district name labels
  markers={[{ lat: 17.385, lng: 78.4867, label: "Hyderabad", color: "#ef4444" }]}
  onMarkerClick={(m) => console.log(m.label)}
/>
```

**Live tracking / routes.** Draw GPS trails with `routes` (polylines) and update
`markers`/`routes` frequently without the map re-zooming, via `fitTo`:

```tsx
<IndiaMap
  mode="leaflet"
  level="state"
  lockToIndia={false}
  fitTo="data"          // frame the trail/points once; live updates don't re-zoom
  routes={[{
    points: gpsTrail,   // [{ lat, lng, label?: "09:52 am" }, …]
    color: "#2563eb", weight: 3,
    showPoints: true, pointColor: "#ef4444",   // a red dot per GPS ping
  }]}
  markers={livePositions.map((p) => ({
    ...p, permanent: true,   // always-on name chip (e.g. the executive's name)
  }))}
/>
```

- `MapMarker.permanent` — show the label as an always-on chip (not just hover).
- `MapRoute.showPoints` — draw a dot at every point; `pointColor`/`pointRadius`
  style them and each point's `label` shows on hover.
- `fitTo` is `"india"` (default when locked), `"data"` (fit to markers/routes once),
  or `"none"` (you set `center`/`zoom`).

### Self-hosted vector basemap (no third-party tiles)

By default the Leaflet map draws raster OSM tiles from `tile.openstreetmap.org`.
For a clean, **own-the-whole-stack** basemap, use the **vector** basemap instead:
vector tiles (built from current OpenStreetMap data, OpenMapTiles schema) rendered
with MapLibre GL **under** the Leaflet boundaries — light-grey, with city / town /
village + road-name labels and **no point-of-interest icons**. No Esri/CARTO/Google.

```tsx
import { IndiaMap } from "vardhan-maps/react";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";

// Zero-config: Vardhan Systems' hosted Telangana + Andhra Pradesh basemap.
<IndiaMap mode="leaflet" level="both" vector style={{ height: 520 }} />
```

`vector` is a shortcut for `vectorStyle={vectorBasemapStyle()}`. To point at your
own tiles (any region, self-hosted), build the style yourself — `pmtilesUrl` and
`glyphsUrl` default to the Vardhan tiles but take any URL:

```tsx
import { IndiaMap, vectorBasemapStyle } from "vardhan-maps/react";

const style = vectorBasemapStyle({
  pmtilesUrl: "https://cdn.example.com/my-region.pmtiles",   // served with range + CORS
  glyphsUrl: "https://cdn.example.com/fonts/{fontstack}/{range}.pbf",
  colors: { water: "#c3d3d9" },   // optional palette overrides
});

<IndiaMap mode="leaflet" level="both" vectorStyle={style} />
```

**Restrict to a region.** Lock and mask the map to a few states instead of all of
India — e.g. for a regional tracking map:

```tsx
<IndiaMap
  mode="leaflet"
  level="both"
  vector
  lockBounds={[[12.4, 76.5], [20.4, 85.5]]}     // hard pan/zoom bounds [[S,W],[N,E]]
  mask maskStates={["Telangana", "Andhra Pradesh"]} maskOpacity={0.6}
  attributionPrefix=""                           // drop Leaflet's default prefix
/>
```

**Building your own tiles.** Any OpenMapTiles-schema `.pmtiles` works. Generate one
from an OSM extract with [Planetiler](https://github.com/onthegomap/planetiler) or
[tilemaker](https://github.com/systemed/tilemaker), host it (plus a `Noto Sans
Regular` glyph fontstack) anywhere that serves **HTTP range requests + CORS**
(Cloudflare R2, S3, …), and pass the URLs to `vectorBasemapStyle`. The default
Vardhan tiles cover **Telangana + Andhra Pradesh** only.

### Attribution

The raster and vector basemaps both credit `© OpenStreetMap contributors` (required
by the ODbL — keep it). Leaflet also adds its own `🇺🇦 Leaflet` prefix; pass
`attributionPrefix=""` to remove it, or a string for your own branding.

### Live demo

A runnable Vite demo (choropleth → click a state to drill into its districts,
resolution toggle, tooltips) lives in [`examples/demo`](./examples/demo):

```bash
cd examples/demo && pnpm install && pnpm dev
```

> **Module format:** ESM-only (so per-state district chunks can code-split). Works
> in every modern bundler (Vite, webpack, Next) and Node ≥18. From CommonJS, use a
> dynamic `await import("vardhan-maps/data")`.

## Regenerating the data

```bash
pnpm data:fetch    # Overpass → data/raw/ (OSM admin_level 4 & 5)
pnpm data:build    # normalise → simplify → GoI patch → src/data/generated/
```

The GoI border corrections live in `data/overrides/<state>.geojson` and are applied
by `scripts/lib/patch.mjs`. See [ROADMAP.md](./ROADMAP.md) for what's done and next.

## Data coverage

Boundaries are generated from OpenStreetMap. All 36 states/UTs carry their districts
(`admin_level=5`), **787 in total, every one assigned to its state** (interior
point-on-surface assignment, so even concave border districts resolve correctly).
Notes:

- Single-district UTs (e.g. Chandigarh, Lakshadweep) correctly show one district.
- District *vintages* follow OSM currency (a newly split district may lag until OSM
  catches up); counts track OSM, not a fixed census year.

State outlines and GoI border patches are complete for all 36 states/UTs.

## Development

```bash
pnpm install
pnpm typecheck     # tsc --noEmit
pnpm test          # vitest (data loaders, SVG, projection, pipeline)
pnpm build         # tsup → dist/
pnpm data:build    # regenerate src/data/generated from data/raw
```

CI (`.github/workflows/ci.yml`) runs typecheck + test + build on every push/PR.
Pushing a `v*` tag triggers `release.yml` to publish to npm (needs an `NPM_TOKEN`
repo secret).

## Publishing (maintainers)

The package is **published** at [`vardhan-maps`](https://www.npmjs.com/package/vardhan-maps),
builds on `prepublishOnly`, ships only `dist` + docs, and is public
(`publishConfig.access = "public"`). Bump the version, then publish (2FA/OTP-gated —
you must be logged in as the owner: `npm whoami`).

### With npm

```bash
npm login                       # once
npm version patch               # bump 0.2.0 → 0.2.1 (also tags git)
npm publish                     # runs the build via prepublishOnly
# npm publish --otp=123456      # if you have 2FA enabled
npm publish --dry-run           # inspect the tarball without publishing
```

### With pnpm

```bash
pnpm login                      # once (same npm registry/credentials)
pnpm version patch
pnpm publish                    # builds + publishes; verifies a clean git tree
# pnpm publish --no-git-checks  # to skip the clean-tree check
pnpm publish --dry-run          # inspect only
```

Both read the same `~/.npmrc` auth, so you only need to log in once. After
publishing, install anywhere with `npm i vardhan-maps` / `pnpm add vardhan-maps`.

## License

Code: **MIT**. Data: **ODbL 1.0** (© OpenStreetMap contributors) — see
[ATTRIBUTION.md](./ATTRIBUTION.md).
