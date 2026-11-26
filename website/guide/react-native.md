# React Native

`vardhan-maps/react-native` renders the same self-hosted vector basemap (pmtiles,
rendered natively via MapLibre Native) under India state/district boundaries and
marker/route overlays — the same data and `vectorBasemapStyle()` as the web
renderer.

```bash
npm add @maplibre/maplibre-react-native react-native
```

```tsx
import { IndiaMapNative } from "vardhan-maps/react-native";

<IndiaMapNative
  level="both"
  stateName="Karnataka"   // focuses the state; its own tiles auto-load
  vector
  style={{ flex: 1 }}
/>
```

Like the web renderer it supports `level`, `stateName`/`stateNames`, `resolution`,
`vector`/`vectorStyle`, `clipToStates`, markers, and `onRenderComplete`. The
per-state basemap auto-selection (`stateTilesUrl` / `HOSTED_STATE_TILES`) works
the same way and is re-exported from `vardhan-maps/react-native`.
