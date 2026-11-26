# Getting started

`vardhan-maps` is a standard India map — state and district boundaries aligned to
the official Government of India depiction — shipped as **GeoJSON data**,
dependency-free **SVG**, **React** (Leaflet/MapLibre), and **React Native**
renderers, plus an optional **self-hosted vector basemap**. Built on OpenStreetMap.

## Install

```bash
npm add vardhan-maps
```

The package ships independent subpath entry points — pull only what you use. All
peer deps are **optional**; add them for the renderer you pick:

```bash
# React (Leaflet) renderer
npm add leaflet react

# the self-hosted vector basemap
npm add maplibre-gl @maplibre/maplibre-gl-leaflet pmtiles

# React Native renderer
npm add @maplibre/maplibre-react-native react-native
```

> **maplibre-gl v3, v4, or v6** (peer range `>=3 <5 || >=6.4.1`). **v5 is not
> supported.** v6 needs a one-line `workerUrl` under some bundlers — see
> [Vector basemap](/guide/vector-basemap).

## Entry points

| Import | What it gives |
|---|---|
| `vardhan-maps` | types + `VERSION` metadata (no map data) |
| `vardhan-maps/data` | GeoJSON + accessors (`states`, `getState`, `loadDistricts`, …) |
| `vardhan-maps/svg` | `renderIndiaSvg()` — a dependency-free SVG string |
| `vardhan-maps/react` | `<IndiaMap>`, `IndiaSvgMap`, `IndiaLeafletMap`, vector basemap |
| `vardhan-maps/react-native` | `IndiaMapNative` (MapLibre Native) |
| `vardhan-maps/spec` | `VardhanMapSpec` + renderers (AI/tool-friendly) |

## First map

```tsx
import { IndiaMap } from "vardhan-maps/react";
import "leaflet/dist/leaflet.css";

// Inline SVG (default, tile-less); districts fetched on demand:
<IndiaMap level="both" resolution="low" onDistrictClick={(n) => console.log(n)} />

// Leaflet slippy map with the self-hosted vector basemap:
<IndiaMap mode="leaflet" level="both" vector style={{ height: 520 }} />
```

Continue with **[the data](/guide/data)**, **[React](/guide/react)**, or the
**[vector basemap](/guide/vector-basemap)**.

## License

Code is **MIT**. Map data is **ODbL 1.0** — any product must credit
"© OpenStreetMap contributors". This is **not** an official or survey-grade map;
boundaries are a best-effort approximation of the GoI depiction.
