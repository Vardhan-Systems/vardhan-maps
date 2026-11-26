# SVG renderer

`vardhan-maps/svg` renders India (or one state's districts) to a standalone SVG
**string** — no DOM, no dependencies. Great for server rendering, emails, static
images, or an `<img>`/inline hero.

```ts
import { renderIndiaSvg } from "vardhan-maps/svg";
import { loadAllDistricts } from "vardhan-maps/data";

// State choropleth (no district data needed):
renderIndiaSvg({
  level: "state",
  stateFill: (name) => (name === "Telangana" ? "#2563eb" : "#e2e8f0"),
});

// District map — pass loaded districts:
const districts = await loadAllDistricts();
renderIndiaSvg({ level: "both", districts, width: 900, height: 1000 });
// → "<svg …>…</svg>"
```

## Options

| Option | Type | Notes |
|---|---|---|
| `level` | `"state" \| "district" \| "both"` | default `"state"` |
| `districts` | `DistrictCollection` | **required** for `"district"`/`"both"` |
| `stateName` | `string` | restrict districts to one state |
| `width` / `height` / `padding` | `number` | viewport |
| `stateFill` / `districtFill` | `(name, props) => string` | choropleth hooks |
| `stateStyle` / `districtStyle` | `{ fill, stroke, strokeWidth }` | base styling |
| `titles` | `boolean` | `<title>` per feature for hover (default `true`) |

::: tip
The README hero on GitHub is generated exactly this way — see
[`scripts/gen-hero.mjs`](https://github.com/Vardhan-Systems/vardhan-maps/blob/main/scripts/gen-hero.mjs).
:::
