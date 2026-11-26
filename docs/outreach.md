# Outreach kit — vardhan-maps

Draft copy + a checklist to grow adoption and stars. Nothing here is posted
automatically — adapt and post from your own accounts.

---

## One-line pitch

> A standard, GoI-aligned **India map for React** — all 36 states/UTs + 787
> districts as GeoJSON, with SVG / Leaflet / React Native renderers and a
> zero-config self-hosted OpenStreetMap vector basemap. `npm i vardhan-maps`.

## Show HN / Reddit title

> Show HN: vardhan-maps — a GoI-aligned India map for React (states, districts, self-hosted basemap)

## Post body (HN / Dev.to / Reddit r/reactjs, r/webdev, r/india)

> I kept needing a clean map of India for dashboards and tracking apps, and the
> options were either heavy (full GL stacks), US/EU-centric, or showed India's
> borders in a way that isn't the official Government-of-India depiction. So I
> built **vardhan-maps**.
>
> What it gives you:
> - **All 36 states/UTs + 787 districts** as standard GeoJSON, boundaries aligned
>   to the official GoI depiction (J&K incl. PoK; Ladakh incl. Gilgit-Baltistan +
>   Aksai Chin), with ISO 3166-2:IN codes.
> - **Three renderers**: a dependency-free SVG string, React (Leaflet/MapLibre),
>   and React Native — pick what you need; all peer deps are optional.
> - **A zero-config self-hosted vector basemap** (light-grey, roads + labels, no
>   POI) covering every state, refreshed monthly from current OpenStreetMap data.
>   Focus a state and its tiles auto-load.
> - Choropleth, tooltips, live-tracking markers/routes, region lock/mask, and an
>   AI-friendly declarative map spec.
>
> ESM-only, MIT (data ODbL / © OpenStreetMap contributors).
>
> npm: https://www.npmjs.com/package/vardhan-maps
> repo: https://github.com/Vardhan-Systems/vardhan-maps
>
> Feedback and issues very welcome.

## X / LinkedIn thread (short)

1. Needed a clean, GoI-aligned map of India for React apps. Built one. 🇮🇳
   `npm i vardhan-maps`
2. All 36 states/UTs + 787 districts as GeoJSON. SVG, Leaflet/React, and React
   Native renderers. All peers optional.
3. Plus a zero-config self-hosted OSM vector basemap for every state, refreshed
   monthly. Choropleth, live tracking, region clip/mask.
4. MIT, open source. ⭐ if useful: <repo link>

---

## Checklist (external — do from your accounts)

- [ ] **Repo polish**: add a hero GIF/screenshot to the README; set the repo's
      social-preview image (Settings → Social preview).
- [ ] **GitHub**: set topics + description + homepage (done via `gh` in this PR's
      session — verify), enable **Discussions**, add a few `good first issue`s.
- [ ] **npm**: confirm the README renders on npmjs.com after the next publish.
- [ ] **Submit to awesome lists**: `awesome-react`, `awesome-geojson`,
      `awesome-india`, `awesome-maps` (open PRs adding vardhan-maps).
- [ ] **Write-ups**: a short Dev.to / Hashnode post ("building a GoI-aligned India
      map"); cross-post to LinkedIn.
- [ ] **Communities**: r/reactjs, r/webdev, r/india, r/gis, Reactiflux Discord,
      relevant Indian-dev Telegram/WhatsApp groups.
- [ ] **Show HN** (Tue–Thu morning US time tends to do best).
- [ ] **Direct**: reach out to Indian logistics/delivery/civic-tech teams who'd use
      a state/district map; offer help integrating.
- [ ] **SEO**: ensure the npm description + keywords cover "india map react",
      "india geojson", "india districts", "telangana/andhra/karnataka map".
