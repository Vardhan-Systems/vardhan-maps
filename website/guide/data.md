# The data (GeoJSON)

Everything is standard GeoJSON — drop it into Leaflet, D3, MapLibre, Mapbox,
turf, etc. **States are eager** (bundled, tiny). **Districts load lazily**, per
state, at a resolution you choose.

```ts
import {
  states, getState, getStates,   // eager states (low res)
  loadDistricts, loadAllDistricts, loadStates,
  meta, RESOLUTIONS,
} from "vardhan-maps/data";

states.features.length;                 // 36 states/UTs, no async
getState("Andhra Pradesh");             // StateFeature | undefined

await loadDistricts("Telangana");       // just this state's chunk (low res)
await loadDistricts("Kerala", { resolution: "high" });
await loadAllDistricts();               // every district (787), low res
await loadStates("high");               // higher-detail state outlines

meta.resolutions;                       // ["low","high"]
meta.goiBordersPatched;                 // true
```

Only the chunks you request are fetched, so a country overview stays lightweight
while a single-state drill-in can pull `high` detail on demand.

## Feature properties

- **States** — `{ name, code? }`, where `code` is the **ISO 3166-2:IN** code
  (e.g. `IN-KL`, `IN-TG`).
- **Districts** — `{ name, state }`.

## Resolutions

| Tier | Use | Simplification |
|---|---|---|
| `low` (default) | country / overview | RDP tolerance 0.01° |
| `high` | zoomed-in, single state | RDP tolerance 0.003° |

## Coverage

All **36 states/UTs** carry their districts (`admin_level=5` in OSM), **787 in
total**, each assigned to its state by interior point-on-surface so even concave
border districts resolve correctly. District *vintages* track OSM currency — a
newly split district may lag until OSM catches up.
