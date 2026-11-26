# AI map spec

For AI agents / tools (and any caller that would rather *describe* a map than wire
the renderer), `vardhan-maps/spec` defines a small, serialisable **`VardhanMapSpec`**
and turns it into a map. The AI produces the spec; the library renders it.

```ts
import { validateSpec, specToLeafletProps, renderSpecToSvg } from "vardhan-maps/spec";
import { IndiaLeafletMap } from "vardhan-maps/react";

const spec = {
  version: "1",
  map: { region: "state", state: "Telangana" },
  visualization: "choropleth",
  data: [ { key: "Khammam", value: 42 }, { key: "Hyderabad", value: 38 } ],
  options: { title: "Sales by district", basemap: "vector" },
} as const;

validateSpec(spec);                       // [] when valid, else [{ path, message }]
<IndiaLeafletMap {...specToLeafletProps(spec)} />;   // interactive
const svg = await renderSpecToSvg(spec);  // dependency-free SVG string (static)
```

## The shape

- **`region`** — `"india"` (all states) · `"state"`/`"district"` (a state's
  districts, via `state`/`states`).
- **`visualization`** — `default` · `choropleth` · `markers` · `routes` · `heatmap`.
  Choropleth `data` is keyed by state/district **name** (case-insensitive);
  `markers`/`routes` use `lat`/`lng`.
- **`map.districts: { state, name }[]`** — focus a **specific set of districts**
  (state-qualified): draw only those + their state boundary, fit and hard-clip.
- **`specToLeafletProps`** is pure — build props from a stored spec at render time.
- **`renderSpecToSvg`** draws boundaries + choropleth + hover titles; markers/routes
  are interactive-only (use the Leaflet renderer for those).

Ideal for MCP servers and LLM tool calls: the model emits a tiny JSON spec, your
app validates and renders it.
