# Live demo

These maps are **real** — the published `vardhan-maps` package running in your
browser, not screenshots.

## Click a state to drill in

**Click any state or UT** and the map drills into it — loading that state's
self-hosted vector basemap (roads, water, labels) with its district boundaries on
top. Hit **← Back to India** to return. Every one of the 36 states/UTs works.

<StateExplorer />

```tsx
import { IndiaMap } from "vardhan-maps/react";
import "leaflet/dist/leaflet.css";

// Overview, then focus a state → its own tiles + districts:
<IndiaMap mode="leaflet" level="both" stateName="Karnataka" vector />
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
