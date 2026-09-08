# GoI boundary overrides

Drop a GeoJSON **Feature** or bare **geometry** here, named `<state-slug>.geojson`,
to replace the OpenStreetMap geometry for a disputed state with the official
Government-of-India depiction. `scripts/lib/patch.mjs` applies these during
`pnpm data:build`.

Expected files (see `DISPUTED_STATES` in `scripts/lib/patch.mjs`):

- `jammu-and-kashmir.geojson`
- `ladakh.geojson`
- `arunachal-pradesh.geojson`

Until a file exists for a state, that state keeps its OSM geometry and the built
dataset is marked `goiBordersPatched: false`. These overrides are an editorial
approximation, **not** an official/survey boundary — see `../../ATTRIBUTION.md`.
