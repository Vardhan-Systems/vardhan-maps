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
- [x] **Multi-resolution + lazy per-state loading.** Two tiers (`low` 0.01°, `high`
      0.003°); states eager, districts lazy via `loadDistricts(state, { resolution })`
      / `loadAllDistricts()` (esbuild code-splits one chunk per state). ESM-only so
      the chunks can split. `renderIndiaSvg` takes `districts`; React auto-loads them.

## v0.3.0 — official-GoI depiction ✅ (J&K/Ladakh)
- [x] `data/overrides/` for Jammu & Kashmir (+ Azad Kashmir) and Ladakh (+ Gilgit-
      Baltistan + Aksai Chin), unioned from OSM → `meta.goiBordersPatched === true`.
      Arunachal Pradesh already maps within India in OSM, so needs no override.
- [ ] Independent review of each correction against the official depiction.

## v0.2 additions ✅
- [x] ISO 3166-2:IN `code` on all 36 states.
- [x] Hover tooltips in `IndiaSvgMap` (boolean or custom render prop).
- [x] Tests (vitest: data loaders, SVG render, projection, pipeline libs) — 21 passing.
- [x] CI (`ci.yml`) + tag-driven npm publish (`release.yml`).
- [x] Runnable Vite demo in `examples/demo` (choropleth, drill-in, resolution, tooltips).

## Next
- [ ] Publish to npm (see README → Publishing).
- [ ] Verify state/district names against a canonical list; name-normalisation utils.
- [ ] Optional MapLibre helper; per-year district vintages; a hosted demo site.

## Known limitations
- Boundaries are an approximation of the GoI depiction, not an official/survey map.
- District vintages track OSM currency (a newly split district may lag).
- ESM-only (CommonJS users load via dynamic `import()`).
