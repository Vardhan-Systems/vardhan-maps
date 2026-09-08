# Attribution & data licensing

## Code

The source code of `vardhan-maps` is licensed under the **MIT License** (see `LICENSE`).

## Map data — OpenStreetMap, ODbL 1.0

The boundary geometry (state and district polygons) is **derived from
OpenStreetMap** and is therefore licensed under the
**[Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1-0/)**.

If you use this data you must:

1. **Attribute** OpenStreetMap. Any map or product using this data must carry the
   credit: **“© OpenStreetMap contributors”**, linking to
   <https://www.openstreetmap.org/copyright>.
2. **Share-alike** — if you publicly use an *adapted* version of the underlying
   database, you must release the adapted database under ODbL as well. (Producing
   and sharing a *rendered image* — a “Produced Work” — does not by itself trigger
   share-alike, but the attribution requirement still applies.)

## Depiction of India's external boundaries — read this

This package aims to present India's boundaries in line with the **official
Government of India depiction** (e.g. Jammu & Kashmir and Ladakh, and Arunachal
Pradesh, shown as part of India).

**How that is produced, and its limits:**

- The base geometry comes from OpenStreetMap, whose default data follows OSM's own
  “on the ground / disputed” mapping conventions, which do **not** match the
  official Government of India depiction for the disputed regions.
- This package applies **editorial corrections** (see `data/overrides/` and
  `scripts/patch-borders.mjs`) to the disputed segments so the result aligns with
  the GoI depiction as closely as our sourcing allows.
- These corrections are a **best-effort approximation**, not a survey-grade or
  government-certified boundary. **This is not an official map of India** and must
  not be represented as one. For any legal, official, or survey purpose, use the
  Survey of India's authoritative maps.

By using this package you accept that the boundary depiction is provided “as is”,
for general-purpose visualisation only, with no warranty as to accuracy or
official status.
