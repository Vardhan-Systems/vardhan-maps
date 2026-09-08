# Changelog

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
