---
name: vardhan-maps
description: >-
  Integrate the `vardhan-maps` npm package — India state/district boundaries
  (GeoJSON, aligned to the official GoI depiction) plus a self-hosted light-grey
  OpenStreetMap **vector basemap** (roads + place labels, no POI icons) rendered
  with Leaflet + MapLibre GL. Use when adding a map of India — or of Indian states
  such as Telangana / Andhra Pradesh — to a React/Leaflet app, when building a
  live-tracking / delivery-route / customer map, or when you see imports from
  "vardhan-maps". Covers the zero-config vector basemap, region locking/masking,
  custom self-hosted tiles, and the non-obvious integration footguns.
---

# Integrating vardhan-maps

`vardhan-maps` ships four subpath entry points — pull only what you use:
`vardhan-maps` (types/meta), `/data` (GeoJSON + loaders), `/svg` (dependency-free
SVG string), `/react` (`IndiaMap`, `IndiaSvgMap`, `IndiaLeafletMap`).

## The fast path: a grey vector basemap of India

```tsx
"use client"; // the Leaflet/MapLibre map is client-only — never SSR it
import { IndiaMap } from "vardhan-maps/react";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css"; // REQUIRED when using `vector`

<IndiaMap mode="leaflet" level="both" vector style={{ position: "absolute", inset: 0 }} />
```

`vector` renders Vardhan Systems' hosted **Telangana + Andhra Pradesh** basemap with
zero config (light-grey, roads + place/road labels, **no POI icons**). It's shorthand
for `vectorStyle={vectorBasemapStyle()}`.

Peer deps for the vector basemap (all optional; install when you use it):

```bash
npm add leaflet react maplibre-gl@^4 @maplibre/maplibre-gl-leaflet pmtiles
```

## 🚨 Footguns (these cost real debugging time)

1. **maplibre-gl MUST be v3 or v4 — NOT v5/v6.** v6 silently fails to load the
   `pmtiles://` source: `map.isStyleLoaded()` stays `false`, **no error is thrown**,
   and you get only the grey background with your border overlays but *no roads/
   labels*. Pin `"maplibre-gl": "^4.7.1"`. (The map's canvas mounting is not proof it
   works — check `isSourceLoaded('osm')`.)
2. **Client-only.** Render the Leaflet map behind `next/dynamic` with `ssr: false`
   (or otherwise never on the server). It touches `window`/`document`.
3. **Next.js / Turbopack cache.** After changing the `vardhan-maps` dependency (or a
   local `file:` link), kill the dev server + `rm -rf .next` + restart, or Turbopack
   serves a stale compiled chunk of the old code.
4. **Import both CSS files** (`leaflet` and `maplibre-gl`) when using `vector` /
   `vectorStyle`, or the canvas/controls mis-render.

## Restrict the map to a region (e.g. a couple of states)

By default the map locks/masks to all of India. To scope it to specific states —
e.g. a regional tracking map that must not show the whole country:

```tsx
<IndiaMap
  mode="leaflet" level="both" vector
  lockBounds={[[12.4, 76.5], [20.4, 85.5]]}          // hard pan/zoom bounds [[S,W],[N,E]]
  mask maskStates={["Telangana", "Andhra Pradesh"]}  // dim everything outside these
  maskOpacity={0.6}                                  // 0.9+ hides neighbours entirely
  attributionPrefix=""                               // drop Leaflet's "🇺🇦 Leaflet" prefix
/>
```

## Your own tiles (any region / self-hosting)

The default tiles cover only TG+AP. For other regions, build your own and pass the
URLs — `pmtilesUrl`/`glyphsUrl` are the only required-in-practice fields:

```tsx
import { IndiaMap, vectorBasemapStyle } from "vardhan-maps/react";

const style = vectorBasemapStyle({
  pmtilesUrl: "https://cdn.example.com/region.pmtiles", // OpenMapTiles schema
  glyphsUrl:  "https://cdn.example.com/fonts/{fontstack}/{range}.pbf",
  colors: { water: "#c3d3d9" }, // optional palette overrides
});
<IndiaMap mode="leaflet" level="both" vectorStyle={style} />
```

Tile requirements:
- **Schema:** OpenMapTiles (source-layers `transportation`, `place`, `water`,
  `landcover`, `transportation_name`, …). Build with **Planetiler** (`java -jar
  planetiler.jar --osm-path=extract.pbf --output=region.pmtiles`) or **tilemaker**.
- **Serving:** the `.pmtiles` and glyph `.pbf`s must be served with **HTTP range
  requests + CORS** (Cloudflare R2, S3, a range-capable static server). pmtiles reads
  byte ranges — a server without range support renders nothing.
- **Glyphs:** host a fontstack folder; the style defaults to `Noto Sans Regular`
  (note the spaces — a common mismatch is naming the folder `NotoSans-Regular`).

## Overlays (markers, routes, choropleth)

- `markers` — points; `MapMarker.permanent` shows an always-on name chip.
- `routes` — GPS polylines; `showPoints` draws a dot per ping, each with a hover
  `label`; `pointColor`/`pointRadius` style them.
- `districtFill(name, props)` / `stateFill` — choropleth style hooks; bump `dataKey`
  to redraw overlays without remounting the map.
- `fitTo="data"` frames markers/routes **once** so live updates don't re-zoom.
- Boundaries are drawn **on top of** the basemap, so they always show even where the
  basemap tiles don't cover — good for the state/district outlines.

## Attribution

Both basemaps credit `© OpenStreetMap contributors` (ODbL requires it — keep it).
`attributionPrefix=""` removes Leaflet's own prefix; a string sets custom branding.
