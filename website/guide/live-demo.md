# Live demo

These maps are **real** — the published `vardhan-maps` package running in your
browser, not screenshots.

## India — interactive choropleth

State boundaries from `vardhan-maps/data`, drawn with Leaflet. Hover a state; pan
and zoom.

<MapDemo />

```tsx
import { IndiaMap } from "vardhan-maps/react";
import "leaflet/dist/leaflet.css";

<IndiaMap mode="leaflet" level="state" style={{ height: 460 }} />
```

## A state's self-hosted vector basemap

Karnataka's roads + labels, served as a self-hosted `.pmtiles` from Cloudflare R2
and rendered with MapLibre GL under Leaflet. Every one of the 36 states/UTs has
its own tiles, refreshed monthly from current OpenStreetMap data.

<BasemapDemo />

```tsx
import { IndiaMap } from "vardhan-maps/react";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";

// Focus a state → its own tiles load automatically:
<IndiaMap mode="leaflet" level="district" stateName="Karnataka" vector />
```

See **[Vector basemap](/guide/vector-basemap)** for the full API.
