# Roadmap

## v0.0.x — foundation (current)
- [x] Package scaffold: subpath exports (`/data`, `/svg`, `/react`), tsup build, MIT + ODbL.
- [x] Data module + types (`states`, `districts`, `getState`, `getDistricts`, `meta`).
- [x] Dependency-free SVG renderer (`renderIndiaSvg`) + projection/path core.
- [x] React `IndiaSvgMap`, `IndiaLeafletMap`, and `IndiaMap` dispatcher.
- [x] Data pipeline scripts: Overpass fetch → simplify (RDP) → GoI patch → build.
- [x] **Sample dataset** (Telangana + Andhra Pradesh) so renderers work end-to-end.

## v0.1.0 — full India, state level
- [ ] Run `data:fetch`/`data:build` for all 28 states + 8 UTs (admin_level=4).
- [ ] Verify names against a canonical list; add ISO `code` per state.
- [ ] Publish a first `states`-complete release.

## v0.2.0 — all districts
- [ ] admin_level=5 for every district (~780); centroid → parent-state assignment.
- [ ] Multi-resolution data (a low-detail set for overviews, high-detail for drill-in).
- [ ] Lazy per-state district loading so `/data` isn't one giant payload.

## v0.3.0 — official-GoI depiction
- [ ] Author `data/overrides/` geometry for Jammu and Kashmir, Ladakh, Arunachal Pradesh
      so `meta.goiBordersPatched === true`.
- [ ] Document each correction and its provenance.

## v1.0.0
- [ ] Stable API, examples site, tests (projection, PIP, simplify), CI publish.
- [ ] Optional: MapLibre helper, name-normalisation utilities, per-year district vintages.

## Known limitations
- Sample data only until v0.1.
- Boundaries are an approximation of the GoI depiction, not an official/survey map.
- Full district GeoJSON is large; multi-resolution + lazy loading is planned (v0.2).
