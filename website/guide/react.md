# React (Leaflet)

The React components lazy-load districts for you — just pass `resolution`.

```tsx
import { IndiaMap } from "vardhan-maps/react";
import "leaflet/dist/leaflet.css"; // only for mode="leaflet"

// Tile-less inline SVG (default); districts fetched on demand:
<IndiaMap level="both" resolution="low" onDistrictClick={(name) => console.log(name)} />

// One state's districts at high detail:
<IndiaMap level="district" stateName="Kerala" resolution="high" />

// Leaflet slippy map:
<IndiaMap mode="leaflet" level="both" style={{ height: 520 }} />
```

`IndiaSvgMap` and `IndiaLeafletMap` are also exported directly. Both support
`level`, `stateName`, `resolution`, per-feature styling, choropleth `fill` hooks,
and click handlers.

## Tooltips

```tsx
<IndiaMap
  level="state"
  tooltip={(c) => <b>{c.name} · {(c.props as { code?: string }).code}</b>}
/>
```

## India-locked Leaflet map

`IndiaMap mode="leaflet"` keeps the view **India-only** by default: `lockToIndia`
(hard pan/zoom bounds) and `mask` (greys out everything outside India) are on
unless disabled.

```tsx
<IndiaMap
  mode="leaflet"
  level="both"
  labels                                   // permanent name labels
  markers={[{ lat: 17.385, lng: 78.4867, label: "Hyderabad", color: "#ef4444" }]}
  onMarkerClick={(m) => console.log(m.label)}
/>
```

## Live tracking / routes

Draw GPS trails with `routes` and update `markers`/`routes` frequently without the
map re-zooming, via `fitTo`:

```tsx
<IndiaMap
  mode="leaflet"
  level="state"
  lockToIndia={false}
  fitTo="data"                 // frame the trail once; live updates don't re-zoom
  routes={[{
    points: gpsTrail,          // [{ lat, lng, label?: "09:52 am" }, …]
    color: "#2563eb", weight: 3,
    showPoints: true, pointColor: "#ef4444",
  }]}
  markers={livePositions.map((p) => ({ ...p, permanent: true }))}
/>
```

- **`MapMarker.permanent`** — always-on label chip.
- **`MapRoute.showPoints`** — a dot per point; `pointColor`/`pointRadius` style them.
- **`fitTo`** — `"india"` (default when locked) · `"data"` · `"none"`.
- **`crispBorders`** — draw boundaries as a de-duplicated TopoJSON line mesh (no
  doubled/spiky borders). Optional peers `topojson-client` + `topojson-server`.

## Region clip / focus

```tsx
// Only these districts (state-qualified) + their state boundary, fit + hard-clip:
<IndiaLeafletMap
  districts={[{ state: "Telangana", name: "Khammam" }, { state: "Telangana", name: "Nalgonda" }]}
  clipToDistricts
/>
```
