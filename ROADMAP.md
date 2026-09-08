# Roadmap

## v0.0.x — foundation (current)
- [x] Package scaffold: subpath exports (`/data`, `/svg`, `/react`), tsup build, MIT + ODbL.
- [x] Data module + types (`states`, `districts`, `getState`, `getDistricts`, `meta`).
- [x] Dependency-free SVG renderer (`renderIndiaSvg`) + projection/path core.
- [x] React `IndiaSvgMap`, `IndiaLeafletMap`, and `IndiaMap` dispatcher.
- [x] Data pipeline scripts: Overpass fetch → simplify (RDP) → GoI patch → build.
- [x] **Sample dataset** (Telangana + Andhra Pradesh) so renderers work end-to-end.

## v0.1.0 — full India, state level ✅
- [x] `data:fetch`/`data:build` for all 28 states + 8 UTs (admin_level=4), deduped.
- [ ] Verify names against a canonical list; add ISO `code` per state (only TG/AP coded so far).

## v0.2.0 — districts (current)
- [x] admin_level=5 districts fetched per-state (resumable, mirrors) → **787 districts**.
- [x] Centroid → parent-state assignment; dedupe by name+state (keeps same-named
      districts across states).
- [x] **Closed the UP/Assam/Delhi/Chandigarh holes** — those were transient fetch
      failures, not a level mismatch (all districts are at level 5). Re-fetched.
      Dropped a Bangladesh division ("Rangpur") that had leaked into the India query.
- [x] Point-on-surface + vertex-majority state assignment → **0 unassigned districts**.
- [ ] Multi-resolution data + lazy per-state district loading (the full set is ~1.5 MB).

## v0.3.0 — official-GoI depiction ✅ (J&K/Ladakh)
- [x] `data/overrides/` for Jammu & Kashmir (+ Azad Kashmir) and Ladakh (+ Gilgit-
      Baltistan + Aksai Chin), unioned from OSM → `meta.goiBordersPatched === true`.
      Arunachal Pradesh already maps within India in OSM, so needs no override.
- [ ] Independent review of each correction against the official depiction.

## v1.0.0
- [ ] Stable API, examples site, tests (projection, PIP, simplify), CI publish.
- [ ] Optional: MapLibre helper, name-normalisation utilities, per-year district vintages.

## Known limitations
- Sample data only until v0.1.
- Boundaries are an approximation of the GoI depiction, not an official/survey map.
- Full district GeoJSON is large; multi-resolution + lazy loading is planned (v0.2).
