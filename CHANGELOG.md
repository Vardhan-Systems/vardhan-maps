# Changelog

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
