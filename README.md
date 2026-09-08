# vardhan-maps

A **standard India map** — state and district boundaries, aligned to the official
Government of India depiction — as **GeoJSON data** plus optional, dependency-free
**SVG** and **Leaflet/React** renderers. Built on OpenStreetMap.

> ⚠️ **Boundary disclaimer.** Boundaries are a best-effort approximation of the
> official GoI depiction, derived from OpenStreetMap and editorially corrected.
> **This is not an official or survey-grade map of India.** See
> [ATTRIBUTION.md](./ATTRIBUTION.md).

> 🚧 **Status: v0.2.** Ships **all 36 states/UTs + 787 districts**, generated from
> OpenStreetMap, with the GoI border patches applied (J&K includes PoK; Ladakh
> includes Gilgit-Baltistan + Aksai Chin). Every state now has its districts — see
> [Data coverage](#data-coverage) for the one remaining edge case.

## Install

```bash
pnpm add vardhan-maps
# optional, only for the Leaflet renderer:
pnpm add leaflet react
```

The package ships three independent entry points, so you only pull what you use.

## Use the data (no renderer)

```ts
import { states, districts, getState, getDistricts, meta } from "vardhan-maps/data";

states.features.length;           // FeatureCollection of states/UTs
getDistricts("Telangana");        // DistrictFeature[]
getState("Andhra Pradesh");       // StateFeature | undefined
meta.goiBordersPatched;           // dataset provenance
```

Every feature is standard GeoJSON — drop it straight into Leaflet, D3, MapLibre,
Mapbox, turf, etc. Properties: states `{ name, code? }`, districts `{ name, state }`.

## Render an SVG (dependency-free)

```ts
import { renderIndiaSvg } from "vardhan-maps/svg";

const svg = renderIndiaSvg({
  level: "state",              // "state" | "district" | "both"
  width: 900, height: 1000,
  stateFill: (name) => (name === "Telangana" ? "#2563eb" : "#e2e8f0"), // choropleth
});
// → "<svg …>…</svg>"  (server-render it, or set innerHTML)
```

## React

```tsx
import { IndiaMap } from "vardhan-maps/react";
import "leaflet/dist/leaflet.css"; // only if you use mode="leaflet"

// Tile-less inline SVG (default):
<IndiaMap level="state" onStateClick={(name) => console.log(name)} />

// Leaflet slippy map with OSM tiles:
<IndiaMap mode="leaflet" level="both" style={{ height: 520 }} />
```

`IndiaSvgMap` and `IndiaLeafletMap` are also exported directly. Both support
`level`, `stateName` (drill into one state's districts), per-feature styling,
choropleth `fill` hooks, and click handlers.

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

## License

Code: **MIT**. Data: **ODbL 1.0** (© OpenStreetMap contributors) — see
[ATTRIBUTION.md](./ATTRIBUTION.md).
