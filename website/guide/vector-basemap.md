# Vector basemap

A clean, **own-the-whole-stack** basemap: vector tiles built from current
OpenStreetMap data (OpenMapTiles schema) rendered with MapLibre GL **under** the
Leaflet boundaries — light-grey, with place + road-name labels and **no POI
icons**. No Esri/CARTO/Google.

<BasemapDemo />

## Zero config

```tsx
import { IndiaMap } from "vardhan-maps/react";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";

<IndiaMap mode="leaflet" level="both" vector style={{ height: 520 }} />
```

## Per-state tiles, auto-selected

The basemap is hosted as **one `.pmtiles` per state** and covers all 36 states/UTs.
When `vector` is on and you focus a state (`stateName`), the renderer loads that
state's own tiles automatically:

```tsx
<IndiaMap mode="leaflet" level="district" stateName="Karnataka" vector />
```

The resolver is exported if you want it directly:

```ts
import { stateTilesUrl, HOSTED_STATE_TILES } from "vardhan-maps/react";

stateTilesUrl("Karnataka"); // "https://maps.vardhansystems.in/beyond-karnataka.pmtiles"
HOSTED_STATE_TILES;         // every state/UT → its .pmtiles
```

## maplibre-gl v6

> v3/v4 work out of the box. **v6 needs `workerUrl`** — under bundlers/hosts that
> don't serve maplibre's emitted ESM worker chunk (e.g. Next.js on Cloudflare) the
> worker 404s and the canvas paints nothing. Copy
> `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` into your served assets
> and pass `workerUrl="/maplibre-gl-worker.mjs"`.

## Your own tiles

```tsx
import { IndiaMap, vectorBasemapStyle } from "vardhan-maps/react";

const style = vectorBasemapStyle({
  pmtilesUrl: "https://cdn.example.com/my-region.pmtiles", // range + CORS
  glyphsUrl: "https://cdn.example.com/fonts/{fontstack}/{range}.pbf",
  colors: { water: "#c3d3d9" },
});

<IndiaMap mode="leaflet" level="both" vectorStyle={style} />
```

Any OpenMapTiles-schema `.pmtiles` works — build one with
[Planetiler](https://github.com/onthegomap/planetiler) or
[tilemaker](https://github.com/systemed/tilemaker), host it (plus a `Noto Sans
Regular` glyph fontstack) anywhere that serves **HTTP range requests + CORS**
(Cloudflare R2, S3, …).
