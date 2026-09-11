# Changelog

## 0.13.0

- **`onRenderComplete`** (`IndiaLeafletMap` / `IndiaMap mode="leaflet"`, web): a callback
  that fires once the basemap is fully rendered — the vector map's maplibre-gl `idle`
  event (all tiles painted, no pending work), or the raster tile layer's `load`. The
  web twin of the React-Native `onRenderComplete` (0.12.0), so a consumer can keep a
  loader up and reveal the map only once it's completely loaded.

## 0.12.0

- **`onRenderComplete`** (`IndiaMapNative`, React Native): a callback that fires when
  the map is fully rendered for the current view — every basemap tile, boundary and
  marker painted (wraps MapLibre's `onDidFinishRenderingMapFully`). The truest
  "map is completely loaded" signal, so a consumer can keep a loader up and reveal
  the map only once it's ready. May fire again after a pan/zoom re-render — latch on
  the first call for a one-time reveal.

## 0.11.0

- **Ornament toggles** (`IndiaMapNative`, React Native): pass-throughs for MapLibre's
  map ornaments so a consumer can hide the built-in logo and drop in their own brand:
  - `logo?: boolean` — show/hide the MapLibre wordmark (default MapLibre's own, true).
  - `attribution?: boolean` — show/hide the attribution (ⓘ) button (default true).
  - `compass?: boolean` — show/hide the compass.
  - Only the **logo** is safe to hide for branding — **keep `attribution` on**: the
    OpenStreetMap basemap data is ODbL-licensed and requires visible attribution.

## 0.10.0

- **Smooth camera fly on re-fit** (`IndiaMapNative`, React Native): when `fitKey`
  changes, the camera now animates with a curved **"fly"** easing by default (the
  RN twin of the web Leaflet `flyToBounds`) — a zoom-out/pan/zoom-in arc instead of
  a flat move. Two new opt-in knobs:
  - `fitDuration?: number` — animation length for a re-fit (default **900ms**).
  - `fitEasing?: "linear" | "ease" | "fly"` — easing/path (default **"fly"**).
  - The very first fit (before any `fitKey`) stays instant, so the map doesn't fly
    in on mount. Purely additive — existing maps get the nicer fly for free.

## 0.9.0

- **Icon markers + click popups** (Leaflet map, `MapMarker`): a marker can now be
  a real **icon** instead of a plain circle, and can carry a rich **click popup**.
  - `icon?: string` — an HTML/SVG string (e.g. a flag or pin glyph) rendered as a
    Leaflet `divIcon`; when set, `color`/`radius` are ignored. Size it with
    `iconSize?: [w, h]` (default `[24, 24]`) and place its tip with
    `iconAnchor?: [x, y]` (default = the icon's centre). Leaflet's default white
    div-icon box is stripped, so the glyph shows raw.
  - `popup?: string` — rich HTML shown in a click popup (e.g. a customer/visit
    card), distinct from `label` (the hover tooltip). Opens on tap.
  - Circle markers, `label`, `permanent` chips and `onMarkerClick` are unchanged;
    the additions are purely opt-in, so existing maps render identically.
  - Lets a tracking map plot customers as faint clickable dots and flag each visit
    with an icon whose popup shows the customer, time, planned/unplanned and outcomes.
  - React Native renderer (`IndiaMapNative`) is unchanged in this release — the
    icon/popup additions are Leaflet-only for now.

## 0.8.0

- **`vardhan-maps/react-native`** — a new React Native renderer, `<IndiaMapNative />`,
  the native twin of the web `IndiaLeafletMap`. Renders the **same** self-hosted
  grey vector basemap (the `pmtiles` from `vectorBasemapStyle()`, resolved
  **natively** by MapLibre Native — no JS `addProtocol` needed) under India
  state/district boundaries, with the outside-region **mask**, **choropleth**
  fills (`districtFill`/`stateFill`), **markers** (with permanent name chips),
  **routes** (with per-ping dots), **fit-to-data** (`fitTo`/`fitKey`), region
  **lock** (`lockBounds`), and press callbacks — full parity with the web props.
  - Built on [`@maplibre/maplibre-react-native`](https://maplibre.org/maplibre-react-native/)
    (v11 API: `Map` / `Camera` / `GeoJSONSource` / unified `<Layer>`) + `react-native`,
    both **optional peers**. Needs MapLibre Android **11.7.0+** for native pmtiles
    (met by maplibre-react-native ≥11). Android-first; iOS untested.
  - The basemap style and GeoJSON data are shared with the web renderer, so both
    engines stay in sync. No leaflet/maplibre-gl code is pulled into the RN bundle.

## 0.7.0

- **`fitKey`** prop (Leaflet map, `fitTo="data"`): re-frame the data whenever the
  key changes (e.g. the selected item) — the first fit is instant, each later
  change **smoothly flies** to the new bounds, and framing prefers the **routes'**
  extent (a selected trail from start → current) over the markers. Live data
  updates that don't change `fitKey` never move the map. Lets a tracking map
  smoothly fit a newly-selected executive's whole route without remounting.

## 0.6.0

The vector basemap now works with **zero config**:

- **`vector` prop** — `<IndiaMap mode="leaflet" vector />` renders the default
  self-hosted grey basemap with no setup. Shorthand for `vectorStyle={vectorBasemapStyle()}`.
- **`vectorBasemapStyle()`** — `pmtilesUrl` and `glyphsUrl` are now **optional** and
  default to Vardhan Systems' hosted **Telangana + Andhra Pradesh** tiles
  (`VARDHAN_TILES_ORIGIN`, exported). Pass your own for other regions / self-hosting.
- Fixed the default `fontStack` to `"Noto Sans Regular"` (matches the hosted glyphs).
- Added **`SKILL.md`** — an AI-agent integration playbook (recipe + the maplibre-gl
  v4-only / SSR / Turbopack-cache footguns), shipped in the package.

## 0.5.0

Self-hosted **vector** basemap + custom-region controls (so you can own the whole
map stack instead of pulling rendered tiles from a third party):

- **`vectorBasemapStyle(...)`** — build a clean, light-grey MapLibre style for a
  self-hosted OpenStreetMap vector basemap (OpenMapTiles schema, e.g. built with
  Planetiler/tilemaker and served as a `.pmtiles` from your own storage). Place +
  road labels, roads by class, water — and **no point-of-interest icons**. Fully
  configurable palette (`colors`), `lang`, and `fontStack`.
- **`vectorStyle`** prop on the Leaflet map — render that vector basemap (via
  MapLibre GL under the Leaflet overlays) instead of raster tiles. Needs the
  optional peers `maplibre-gl` (**v3/v4 — v5+ not yet supported**),
  `@maplibre/maplibre-gl-leaflet`, and `pmtiles`.
- **`lockBounds`** — hard-lock pan/zoom to a custom region `[[S,W],[N,E]]` (e.g. a
  couple of states) instead of all-India.
- **`maskStates`** — dim everything outside the union of the named states (not just
  outside India); **`maskOpacity`** tunes how strongly.
- **`attributionPrefix=""`** now removes Leaflet's default prefix entirely.

## 0.4.0

Choropleth + custom tooltips on the Leaflet map (for data-driven maps like a
customer/dues heat map):

- **`districtFill` / `stateFill`** — per-feature style overrides (fill by a value).
- **`districtTooltip` / `stateTooltip`** — custom hover-tooltip HTML (e.g. a stats
  card), styled via the built-in `.vm-card` class.
- **`dataKey`** — bump it when your fill/tooltip data changes to redraw the overlay
  without remounting the map (tiles stay).
- **`stateNames`** — restrict districts to several states (e.g. Telangana + Andhra
  Pradesh), not just one.
- **`boundaryTooltips`** — set `false` to suppress the default name-on-hover
  tooltip for a clean map (e.g. live tracking); custom tooltips still show.
- Removed the browser focus-outline rectangle that appeared around a
  clicked/focused boundary path.

## 0.3.0

Live-tracking additions to the Leaflet map:

- **Marker name chips** — `MapMarker.permanent` shows the label as an always-on
  pill (e.g. an executive's name), not just on hover.
- **Route point dots** — `MapRoute.showPoints` draws a dot at every GPS point;
  `pointColor` / `pointRadius` style them, and each point's `label` (e.g. a
  timestamp) shows on hover. New `MapRoutePoint` type.

## 0.2.0 — first public release

Standard India map built on OpenStreetMap: state + district boundaries as GeoJSON
data plus SVG and Leaflet/React renderers.

- **Data**: all 36 states/UTs + 787 districts, aligned to the official Government of
  India depiction (J&K includes PoK; Ladakh includes Gilgit-Baltistan + Aksai Chin).
  ISO 3166-2:IN `code` on every state. Sourced from OpenStreetMap (ODbL).
- **Resolutions**: two tiers (`low` default, `high` detail); states eager, districts
  lazy-loaded per state (`loadDistricts` / `loadAllDistricts`).
- **Renderers**:
  - `vardhan-maps/svg` — dependency-free `renderIndiaSvg()` (choropleth-ready).
  - `vardhan-maps/react` — `IndiaSvgMap`, `IndiaLeafletMap`, `IndiaMap`.
- **Leaflet mode**: OSM basemap under the boundaries; India-only by default
  (`lockToIndia` + `mask`), `markers`, `routes` (GPS trails), `labels`, tooltips,
  choropleth fills, drill-in, and `fitTo` live-update framing for tracking.
- Tests (vitest), CI, and a runnable Vite demo in `examples/demo`.

License: MIT (code) + ODbL (data, © OpenStreetMap contributors).
