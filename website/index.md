---
layout: home
hero:
  name: vardhan-maps
  text: A standard India map for React
  tagline: All 36 states/UTs + 787 districts as GeoJSON — with SVG, Leaflet/MapLibre & React Native renderers and a zero-config self-hosted OpenStreetMap vector basemap. Aligned to the official GoI depiction.
  image:
    src: /hero.png
    alt: Map of India — all 36 states and union territories
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Live demo
      link: /guide/live-demo
    - theme: alt
      text: ⭐ GitHub
      link: https://github.com/Vardhan-Systems/vardhan-maps
features:
  - icon: 🗺️
    title: Every state & district
    details: 36 states/UTs + 787 districts as standard GeoJSON, with ISO 3166-2:IN codes and two resolution tiers. Districts load lazily, per state.
  - icon: 🇮🇳
    title: GoI-aligned boundaries
    details: Borders follow the official Government-of-India depiction (J&K incl. PoK; Ladakh incl. Gilgit-Baltistan + Aksai Chin), derived from OpenStreetMap.
  - icon: 🧩
    title: Pick your renderer
    details: Dependency-free SVG string, React (Leaflet/MapLibre), or React Native. All peer deps are optional — pull only what you use.
  - icon: 🛣️
    title: Self-hosted vector basemap
    details: A light-grey OSM basemap (roads + labels, no POI) for all 36 states/UTs, refreshed monthly. Focus a state and its tiles auto-load. Zero config.
  - icon: 📊
    title: Choropleth & live tracking
    details: Choropleth fills, tooltips, markers, GPS routes, region lock/mask — built for dashboards and delivery/tracking maps.
  - icon: 🤖
    title: AI-friendly map spec
    details: A small serialisable VardhanMapSpec that an agent can emit and the library renders — for tools and MCP callers.
---

## Try it live

Below is a **real, interactive** India map rendered from `vardhan-maps/data` — hover a state, pan and zoom. No screenshot; it's the actual package running in your browser.

<MapDemo />

## Install

```bash
npm add vardhan-maps
# React (Leaflet) renderer:
npm add leaflet react
# the vector basemap (optional):
npm add maplibre-gl @maplibre/maplibre-gl-leaflet pmtiles
```

```tsx
import { IndiaMap } from "vardhan-maps/react";
import "leaflet/dist/leaflet.css";

// Interactive, India-locked map with the self-hosted vector basemap:
<IndiaMap mode="leaflet" level="both" vector style={{ height: 520 }} />
```

Next: **[Getting started →](/guide/getting-started)**
