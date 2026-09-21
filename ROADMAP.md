# Roadmap

## Shipped (v0.18, on npm)

- **maplibre-gl v6 support** — `workerUrl` prop points MapLibre at a self-hosted
  render worker (`maplibre-gl-worker.mjs`) so the vector basemap works under bundlers/
  hosts that don't serve v6's emitted ESM worker chunk (e.g. Next.js on Cloudflare).
  v4 still works with no config; peer range widened to `>=3 <5 || >=6.4.1`.
- **`crispBorders`** — de-duplicated TopoJSON boundary mesh (each shared edge stroked
  once; no doubled borders, no state outline over district edges), fills stay
  interactive. Opt-in; optional `topojson-client` + `topojson-server` peers.

## Shipped (v0.17, on npm)

- **Data** — all 36 states/UTs + 787 districts from OpenStreetMap, GoI border
  patches (J&K + PoK, Ladakh + Gilgit-Baltistan + Aksai Chin), ISO 3166-2:IN codes,
  two resolutions (`low`/`high`), lazy per-state district loading.
- **Renderers** — dependency-free SVG (`renderIndiaSvg`), React `IndiaSvgMap` /
  `IndiaLeafletMap` / `IndiaMap`, and **React Native** (`IndiaMapNative`, MapLibre
  Native via `vardhan-maps/react-native`); choropleth fills + tooltips.
- **Leaflet extras** — markers (name chips), routes (GPS trails + per-point dots),
  `fitTo` live-update framing; `lockToIndia`/`lockBounds` region locking; `mask`/
  `maskStates` region masking; `attributionPrefix` control.
- **Region clip / focus** — `clipToStates` (draw only the named states + hard-clip the
  basemap outside their union) and, since v0.17, **`districts: {state,name}[]` +
  `clipToDistricts`** — a "these districts only" view (draws only those districts + their
  state boundary, fits and hard-clips to them) for clients working in a few districts.
- **AI map spec** — `vardhan-maps/spec`: a serialisable `VardhanMapSpec`
  (region/visualization/data/markers/routes/`map.districts`) with `validateSpec`,
  `specToLeafletProps` (interactive) and `renderSpecToSvg` (static). For AI/tool/MCP callers.
- **Self-hosted vector basemap** — `vectorBasemapStyle()` + the `vector` prop: a
  light-grey OpenStreetMap basemap (roads + place/road labels, **no POI icons**),
  MapLibre GL under Leaflet, English (`name:latin`) labels. Zero-config default
  (Vardhan-hosted Telangana + Andhra Pradesh tiles) or your own `.pmtiles`.
- Tests (vitest) + CI; published to npm.

## Next

- **Auto-refresh** the hosted vector tiles from current OSM (scheduled rebuild) so
  roads stay recent without a package release.
- **Wider default coverage** — the default vector tiles are TG+AP only; add more
  regions / an all-India build.
- Independent review of the GoI border corrections against the official depiction.
- Name-normalisation utils + verification against a canonical state/district list.
- Per-year district vintages; a hosted demo site.

## Known limitations

- Boundaries are an approximation of the GoI depiction, **not** an official/survey map.
- District vintages track OSM currency (a newly split district may lag).
- ESM-only (CommonJS consumers load via dynamic `import()`).
- The default vector basemap covers **Telangana + Andhra Pradesh** only; pass your
  own tiles for other regions.
