import { useEffect, useRef, useState, type CSSProperties } from "react";
import type * as LType from "leaflet";
import type { GeoJsonObject } from "geojson";
import { indiaOutline, loadAllDistricts, loadDistricts, states as allStates, type Resolution } from "../data";
import { bboxOf } from "../core/geo";
import type { DistrictProps, StateProps } from "../data/types";
import { vectorBasemapStyle, type VectorStyle } from "./vector";

/** A point to plot on the map (e.g. a customer, store, city, live position). */
export interface MapMarker {
  lat: number;
  lng: number;
  /** Label text — hover tooltip by default, or an always-on chip if `permanent`. */
  label?: string;
  /** Show `label` as an always-on chip (e.g. an executive's name). */
  permanent?: boolean;
  /** Fill colour (default blue). */
  color?: string;
  /** Circle radius in px (default 5). */
  radius?: number;
  /**
   * Render this marker as an icon instead of a plain circle. Pass an HTML/SVG
   * string (e.g. a flag or pin glyph) — it becomes a Leaflet `divIcon`. When set,
   * `color`/`radius` are ignored. Size it with `iconSize`; place its tip with
   * `iconAnchor` (defaults to the icon's centre).
   */
  icon?: string;
  /** Icon box size in px, `[width, height]` (default `[24, 24]`). */
  iconSize?: [number, number];
  /** Pixel offset of the icon's anchor point (default = centre of `iconSize`). */
  iconAnchor?: [number, number];
  /**
   * Rich HTML shown in a click popup (e.g. a customer/visit card). Opens on tap —
   * distinct from `label`, which is the hover tooltip.
   */
  popup?: string;
}

/** One point of a route; `label` shows on hover when the route draws its points. */
export interface MapRoutePoint {
  lat: number;
  lng: number;
  label?: string;
}

/** A polyline to draw (e.g. a GPS trail / delivery route). */
export interface MapRoute {
  points: MapRoutePoint[];
  color?: string;
  weight?: number;
  opacity?: number;
  /** Hover tooltip text for the line itself. */
  label?: string;
  /** Draw a dot at every point (e.g. each GPS ping). */
  showPoints?: boolean;
  /** Colour of the per-point dots (default = the line colour). */
  pointColor?: string;
  /** Radius of the per-point dots in px (default 3). */
  pointRadius?: number;
}

export interface IndiaLeafletMapProps {
  level?: "state" | "district" | "both";
  /** Restrict districts to one state (level "district"/"both"). */
  stateName?: string;
  /** Restrict districts to several states (e.g. ["Telangana","Andhra Pradesh"]). */
  stateNames?: string[];
  /** District resolution to lazy-load — "low" (default) or "high". */
  resolution?: Resolution;
  /** Show OSM raster tiles under the boundaries. Default true. */
  tiles?: boolean;
  tileUrl?: string;
  tileAttribution?: string;
  /**
   * Shortcut: render Vardhan Systems' default self-hosted OpenStreetMap **vector**
   * basemap (light-grey, place + road labels, no POI icons) with zero config —
   * equivalent to `vectorStyle={vectorBasemapStyle()}`. Ignored if `vectorStyle`
   * is set. Requires the optional peers `maplibre-gl`, `@maplibre/maplibre-gl-leaflet`
   * and `pmtiles`.
   */
  vector?: boolean;
  /**
   * Render a SELF-HOSTED OpenStreetMap **vector** basemap (MapLibre GL) under the
   * boundaries instead of raster tiles — you host the `.pmtiles` + glyph fonts
   * and control what shows (place + road labels, no POI icons). Build one with
   * `vectorBasemapStyle(...)`. When set, the raster `tiles`/`tileUrl` are ignored.
   * Requires the optional peers `maplibre-gl`, `@maplibre/maplibre-gl-leaflet`
   * and `pmtiles`.
   */
  vectorStyle?: VectorStyle | string;
  stateStyle?: LType.PathOptions;
  districtStyle?: LType.PathOptions;
  /** Choropleth: per-district style overrides (e.g. fill by a value). Merged over districtStyle. */
  districtFill?: (name: string, props: DistrictProps) => LType.PathOptions | undefined;
  /** Choropleth: per-state style overrides. Merged over stateStyle. */
  stateFill?: (name: string, props: StateProps) => LType.PathOptions | undefined;
  /** Custom hover tooltip HTML for a district (e.g. a stats card). */
  districtTooltip?: (name: string, props: DistrictProps) => string;
  /** Custom hover tooltip HTML for a state. */
  stateTooltip?: (name: string, props: StateProps) => string;
  /** Bump this when your fill/tooltip data changes so the overlay redraws (no remount). */
  dataKey?: string | number;
  /** Your own points to plot on top (lat/lng), each with an optional label. */
  markers?: MapMarker[];
  /** Polylines to draw (GPS trails / routes) — for live tracking, delivery runs, etc. */
  routes?: MapRoute[];
  /**
   * How the map frames itself:
   *  - "india" (default when locked): keep the India view, never auto-fit to data.
   *  - "data": fit to the markers/routes ONCE (won't re-zoom on live updates).
   *  - "none": never auto-fit — you control the view via `center`/`zoom`.
   */
  fitTo?: "india" | "data" | "none";
  /**
   * With `fitTo="data"`: re-frame the data whenever this key changes (e.g. the
   * selected item). The FIRST fit is instant; each later change **smoothly flies**
   * to the new bounds. When routes are present, framing prefers the routes' extent
   * (a selected trail from start → current) over the markers. Live data updates
   * that DON'T change `fitKey` never move the map — so you can pan/zoom freely.
   */
  fitKey?: string | number;
  /** Initial view centre [lat, lng] (used when you don't want auto-fit). */
  center?: [number, number];
  /** Initial zoom (with `center`). */
  zoom?: number;
  /** Show a permanent name label on each boundary (state or district). */
  labels?: boolean;
  /** Show the default name-on-hover tooltip for boundaries. Default true. Set
   *  false for a clean map (e.g. live tracking) with no boundary hover text.
   *  A custom districtTooltip/stateTooltip still shows regardless. */
  boundaryTooltips?: boolean;
  /** Lock panning/zooming to India (hard bounds + min zoom). Default true. */
  lockToIndia?: boolean;
  /**
   * Lock panning/zoom to a CUSTOM region `[[south,west],[north,east]]` instead of
   * all-India (e.g. a state or a couple of states). When set, the map hard-bounds
   * to this rectangle and can't zoom out past it — regardless of `lockToIndia`.
   */
  lockBounds?: [[number, number], [number, number]];
  /** Grey-out everything outside India's borders. Default true. */
  mask?: boolean;
  /**
   * When masking, dim everything outside the UNION of these states (by name)
   * instead of outside all of India — so only these states read clearly.
   */
  maskStates?: string[];
  /** Colour of the mask. Default light grey. */
  maskColor?: string;
  /** Opacity of the mask (0-1). Default 0.92. Lower = neighbours faintly visible. */
  maskOpacity?: number;
  /**
   * Clip the whole map to the named states (`maskStates`, else `stateNames`):
   * draw ONLY those states' boundaries — not all of India — and fill everything
   * outside their union with a solid `clipColor`, hard-clipping the basemap at the
   * true state border (no neighbouring roads/labels/outlines bleed in). Turns the
   * map into a "these states only" view. Overrides `mask`/`maskColor`/`maskOpacity`
   * with an opaque clip. Default false.
   */
  clipToStates?: boolean;
  /** Solid fill outside the clipped states (with `clipToStates`). Default `#e8e8e6`
   *  — the basemap land colour, so the exterior reads as seamless empty land. */
  clipColor?: string;
  /** Override the attribution-control prefix (defaults to Leaflet's own). Pass "" to remove it. */
  attributionPrefix?: string;
  onStateClick?: (name: string, props: StateProps) => void;
  onDistrictClick?: (name: string, props: DistrictProps) => void;
  onMarkerClick?: (marker: MapMarker) => void;
  /**
   * Fires once the basemap is fully rendered — every tile painted with no work
   * pending (the vector map's maplibre-gl `idle` event, or the raster tile layer's
   * `load`). The "map is completely loaded" signal — use it to reveal the map only
   * once it's ready.
   */
  onRenderComplete?: () => void;
  className?: string;
  style?: CSSProperties;
}

const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// Standard OSM attribution (required by the ODbL). Leaflet's own "Leaflet" prefix
// is left as-is unless the consumer overrides it with `attributionPrefix`.
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// [minLng,minLat,maxLng,maxLat] of India incl. islands → Leaflet [[S,W],[N,E]].
const IN_BBOX = bboxOf({ type: "FeatureCollection", features: [indiaOutline] });
const IN_BOUNDS: [[number, number], [number, number]] = [
  [IN_BBOX[1], IN_BBOX[0]],
  [IN_BBOX[3], IN_BBOX[2]],
];
const asMP = (g: typeof indiaOutline.geometry): number[][][][] =>
  (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as number[][][][];

// Style the always-on marker chip (`permanent` markers) as a small pill. Injected
// once globally (Leaflet builds tooltip DOM outside React). Consumers can restyle
// `.leaflet-tooltip.vm-chip`.
function ensureChipStyles() {
  if (typeof document === "undefined" || document.getElementById("vm-chip-styles")) return;
  const el = document.createElement("style");
  el.id = "vm-chip-styles";
  el.textContent = `
    /* No focus rectangle around clicked/focused boundary paths. */
    .leaflet-container path.leaflet-interactive:focus,
    .leaflet-container path.leaflet-interactive { outline: none; }
    .leaflet-tooltip.vm-chip {
      background:#2563eb;color:#fff;border:none;border-radius:9999px;padding:2px 8px;
      font:600 11px system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.35);white-space:nowrap;
    }
    .leaflet-tooltip.vm-chip::before{display:none}
    .leaflet-tooltip.vm-card {
      background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;
      color:#0f172a;font:inherit;box-shadow:0 8px 24px rgba(15,23,42,.16);white-space:normal;
    }
    .leaflet-tooltip.vm-card.leaflet-tooltip-top::before{border-top-color:#fff}
    .leaflet-tooltip.vm-card.leaflet-tooltip-bottom::before{border-bottom-color:#fff}
    .leaflet-tooltip.vm-card.leaflet-tooltip-left::before{border-left-color:#fff}
    .leaflet-tooltip.vm-card.leaflet-tooltip-right::before{border-right-color:#fff}
    /* Icon markers: drop Leaflet's default white div-icon box so the glyph shows raw. */
    .leaflet-div-icon.vm-icon{background:transparent;border:none;}
    /* Rich click popup for markers (customer/visit card). */
    .leaflet-popup.vm-popup .leaflet-popup-content-wrapper{
      border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,.16);
    }
    .leaflet-popup.vm-popup .leaflet-popup-content{margin:10px 12px;font:inherit;color:#0f172a;}
  `;
  document.head.appendChild(el);
}

// The pmtiles protocol is registered once per page. We track it with a
// module-scoped flag rather than a property on the maplibre-gl module object,
// which is non-extensible (frozen ESM namespace) under bundlers.
let vmPmtilesRegistered = false;

/**
 * India on a Leaflet slippy map — OSM raster tiles (cities, roads, terrain) by
 * default with the state/district boundaries overlaid, plus optional name labels
 * and your own markers. `leaflet` is an optional peer dependency imported lazily
 * (SSR-safe); districts lazy-load. Remember to import "leaflet/dist/leaflet.css".
 *
 * The map is created ONCE (StrictMode-safe deferred teardown); a second effect
 * redraws the overlays whenever the data props change.
 */
export function IndiaLeafletMap(props: IndiaLeafletMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const overlayRef = useRef<LType.LayerGroup | null>(null);
  const lRef = useRef<typeof LType | null>(null);
  const destroyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fittedData = useRef(false); // fit-to-data happens once (live updates don't re-zoom)
  const lastFitKey = useRef<string | number | undefined>(undefined); // re-fit when `fitKey` changes
  const [ready, setReady] = useState(0);

  const level = props.level ?? "state";
  const resolution = props.resolution ?? "low";
  const lock = props.lockToIndia ?? true;
  const fitTo = props.fitTo ?? (lock ? "india" : "data");
  const {
    stateName, stateNames, tiles, tileUrl, labels, markers, routes, dataKey,
    districtFill, stateFill, districtTooltip, stateTooltip, boundaryTooltips,
    onStateClick, onDistrictClick, onMarkerClick, fitKey,
  } = props;
  const showNameTip = boundaryTooltips !== false;
  // Clip-to-states: draw only these states + hard-clip the basemap outside their
  // union (opaque mask). Falls back to `stateNames` when `maskStates` is unset.
  const clipStates = props.clipToStates ? (props.maskStates ?? stateNames ?? null) : null;
  const stateNamesKey = (stateNames ?? []).join("|");
  const markersKey = JSON.stringify(markers ?? []);
  const routesKey = JSON.stringify(routes ?? []);

  // ── Create the map once (tiles included). Survives StrictMode double-mount. ──
  useEffect(() => {
    let cancelled = false;
    if (destroyTimer.current) { clearTimeout(destroyTimer.current); destroyTimer.current = null; }
    void (async () => {
      const mod = await import("leaflet");
      const L = ((mod as { default?: typeof LType }).default ?? mod) as typeof LType;
      lRef.current = L;
      ensureChipStyles();
      const el = ref.current;
      // Reuse the surviving instance; never create a second map on the container.
      if (cancelled || !el || mapRef.current || (el as unknown as { _leaflet_id?: number })._leaflet_id != null) return;

      // Lock to a custom region if given, else all-India. `lockBounds` forces a
      // lock even when lockToIndia is false.
      const bounds = props.lockBounds
        ? L.latLngBounds(props.lockBounds)
        : L.latLngBounds(IN_BOUNDS).pad(0.03);
      const doLock = lock || !!props.lockBounds;
      const map = L.map(el, {
        scrollWheelZoom: true,
        maxBounds: doLock ? bounds : undefined,
        maxBoundsViscosity: doLock ? 1 : 0,
      });
      if (props.center) map.setView(props.center, props.zoom ?? 5);
      else map.fitBounds(bounds);
      if (doLock) map.setMinZoom(map.getBoundsZoom(bounds));

      // Keep Leaflet's default attribution unless the consumer overrides the prefix.
      if (props.attributionPrefix != null) map.attributionControl.setPrefix(props.attributionPrefix);
      // `vector` is a shortcut for the default Vardhan basemap; `vectorStyle` wins.
      const effectiveVectorStyle = props.vectorStyle ?? (props.vector ? vectorBasemapStyle() : undefined);
      if (effectiveVectorStyle) {
        // Self-hosted OSM vector basemap: a MapLibre GL canvas under the Leaflet
        // overlays (via maplibre-gl-leaflet), reading `.pmtiles` over the pmtiles
        // protocol. All three libs are optional peers, imported only in this path.
        try {
          const glMod = await import("maplibre-gl");
          const maplibregl = ((glMod as { default?: unknown }).default ?? glMod) as {
            addProtocol: (n: string, h: unknown) => void;
          };
          (globalThis as { maplibregl?: unknown }).maplibregl = maplibregl; // the leaflet plugin reads the global
          const pm = (await import("pmtiles")) as { Protocol: new () => { tile: unknown } };
          if (!vmPmtilesRegistered) {
            maplibregl.addProtocol("pmtiles", new pm.Protocol().tile);
            vmPmtilesRegistered = true;
          }
          await import("@maplibre/maplibre-gl-leaflet");
          if (cancelled) return;
          const glLayer = (L as unknown as { maplibreGL: (o: Record<string, unknown>) => LType.Layer })
            .maplibreGL({ style: effectiveVectorStyle, attribution: props.tileAttribution ?? OSM_ATTR });
          glLayer.addTo(map);
          // "Fully rendered" = the underlying maplibre-gl map goes idle (all tiles
          // painted, no pending work). Fires once so the consumer can reveal the map.
          if (props.onRenderComplete) {
            const glMap = (glLayer as unknown as {
              getMaplibreMap?: () => { once: (ev: string, cb: () => void) => void };
            }).getMaplibreMap?.();
            glMap?.once("idle", () => props.onRenderComplete?.());
          }
        } catch (err) {
          // Missing peers or a bad style shouldn't blank the whole map — the
          // boundaries/markers still render on a plain background.
          if (typeof console !== "undefined") console.error("[vardhan-maps] vector basemap failed:", err);
        }
      } else if (tiles !== false) {
        const tl = L.tileLayer(tileUrl ?? OSM_URL, { attribution: props.tileAttribution ?? OSM_ATTR, maxZoom: 19 });
        if (props.onRenderComplete) tl.once("load", () => props.onRenderComplete?.());
        tl.addTo(map);
      }

      // Grey-out everything outside the region: a world rectangle with the region
      // punched out as holes (Leaflet's default evenodd fill-rule makes inner rings
      // holes). Region = the named states' union if `maskStates` is given, else India.
      // Clipping forces the mask on, punched out to the clipped states, opaque.
      if (clipStates || (props.mask ?? true)) {
        const world: number[][] = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
        const holeStates = clipStates ?? props.maskStates ?? null;
        let holes: number[][][];
        if (holeStates?.length) {
          const want = new Set(holeStates);
          const feats = allStates.features.filter((f) => want.has((f.properties as StateProps).name));
          holes = feats.flatMap((f) => asMP(f.geometry as typeof indiaOutline.geometry).map((poly) => poly[0]));
        } else {
          holes = asMP(indiaOutline.geometry).map((poly) => poly[0]);
        }
        const fillColor = clipStates ? (props.clipColor ?? props.maskColor ?? "#e8e8e6") : (props.maskColor ?? "#e5e7eb");
        const fillOpacity = clipStates ? 1 : (props.maskOpacity ?? 0.92);
        L.geoJSON({ type: "Polygon", coordinates: [world, ...holes] } as unknown as GeoJsonObject, {
          interactive: false,
          style: { stroke: false, weight: 0, fillColor, fillOpacity },
        }).addTo(map);
      }

      mapRef.current = map;
      setReady((n) => n + 1); // let the overlay effect run now the map exists
    })();
    return () => {
      cancelled = true;
      destroyTimer.current = setTimeout(() => {
        try { mapRef.current?.remove(); } catch { /* container already detached */ }
        mapRef.current = null;
        overlayRef.current = null;
      }, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Redraw boundaries + markers whenever the data props change. ──────────────
  useEffect(() => {
    const L = lRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    let cancelled = false;
    void (async () => {
      const boundary: LType.Layer[] = [];

      if (level !== "state") {
        let feats;
        if (stateNames?.length) {
          feats = (await Promise.all(stateNames.map((s) => loadDistricts(s, { resolution })))).flat();
        } else if (stateName) {
          feats = await loadDistricts(stateName, { resolution });
        } else {
          feats = (await loadAllDistricts({ resolution })).features;
        }
        if (cancelled) return;
        const dBase = props.districtStyle ?? {
          color: "#94a3b8", weight: 0.8, fillColor: "#f1f5f9", fillOpacity: level === "both" ? 0 : 0.5,
        };
        boundary.push(
          L.geoJSON({ type: "FeatureCollection", features: feats } as unknown as GeoJsonObject, {
            style: (feature) => {
              const p = feature?.properties as DistrictProps;
              return { ...dBase, ...(districtFill?.(p.name, p) ?? {}) };
            },
            onEachFeature: (f, layer) => {
              const p = f.properties as DistrictProps;
              if (districtTooltip) layer.bindTooltip(districtTooltip(p.name, p), { sticky: true, className: "vm-card" });
              else if (labels) layer.bindTooltip(p.name, { permanent: true, direction: "center", className: "vm-label", opacity: 1 });
              else if (showNameTip) layer.bindTooltip(`${p.name}, ${p.state}`, { sticky: true });
              if (onDistrictClick) layer.on("click", () => onDistrictClick(p.name, p));
            },
          }),
        );
      }
      if (level !== "district") {
        const sBase = props.stateStyle ?? {
          color: "#475569", weight: 1, fillColor: "#e2e8f0", fillOpacity: level === "both" ? 0 : 0.4,
        };
        // When clipping, draw only the named states' outlines, not all of India.
        const stateFeats = clipStates
          ? allStates.features.filter((f) => clipStates.includes((f.properties as StateProps).name))
          : allStates.features;
        boundary.push(
          L.geoJSON({ type: "FeatureCollection", features: stateFeats } as unknown as GeoJsonObject, {
            style: (feature) => {
              const p = feature?.properties as StateProps;
              return { ...sBase, ...(stateFill?.(p.name, p) ?? {}) };
            },
            onEachFeature: (f, layer) => {
              const p = f.properties as StateProps;
              if (stateTooltip) layer.bindTooltip(stateTooltip(p.name, p), { sticky: true, className: "vm-card" });
              else if (labels) layer.bindTooltip(p.name, { permanent: true, direction: "center", className: "vm-label", opacity: 1 });
              else if (showNameTip && level !== "both") layer.bindTooltip(p.name, { sticky: true });
              if (onStateClick) layer.on("click", () => onStateClick(p.name, p));
            },
          }),
        );
      }
      if (cancelled) return;

      const group = L.layerGroup([...boundary]);

      // Routes (GPS trails / delivery runs) as polylines, with optional per-point
      // dots (e.g. each GPS ping) that show their `label` (timestamp) on hover.
      // `routeLayers` is tracked separately so framing can prefer a selected trail.
      const data: LType.Layer[] = [];
      const routeLayers: LType.Layer[] = [];
      for (const r of routes ?? []) {
        if (r.points.length >= 2) {
          const line = L.polyline(r.points.map((p) => [p.lat, p.lng]), {
            color: r.color ?? "#2563eb", weight: r.weight ?? 3, opacity: r.opacity ?? 0.9,
          });
          if (r.label) line.bindTooltip(r.label, { sticky: true });
          line.addTo(group);
          data.push(line);
          routeLayers.push(line);
        }
        if (r.showPoints) {
          for (const p of r.points) {
            const dot = L.circleMarker([p.lat, p.lng], {
              radius: r.pointRadius ?? 3, color: "#ffffff", weight: 1,
              fillColor: r.pointColor ?? r.color ?? "#2563eb", fillOpacity: 1,
            });
            if (p.label) dot.bindTooltip(p.label, { direction: "top" });
            dot.addTo(group);
            data.push(dot);
            routeLayers.push(dot);
          }
        }
      }
      // Your own points. An `icon` renders a divIcon glyph (e.g. a flag); otherwise
      // a plain circle. `permanent` shows the label as an always-on chip; `popup`
      // opens a rich card on click.
      for (const m of markers ?? []) {
        let cm: L.CircleMarker | L.Marker;
        if (m.icon) {
          const size = m.iconSize ?? [24, 24];
          const anchor = m.iconAnchor ?? [size[0] / 2, size[1] / 2];
          cm = L.marker([m.lat, m.lng], {
            icon: L.divIcon({
              html: m.icon,
              className: "vm-icon",
              iconSize: size,
              iconAnchor: anchor,
            }),
          });
        } else {
          cm = L.circleMarker([m.lat, m.lng], {
            radius: m.radius ?? 5, color: "#ffffff", weight: 1.5, fillColor: m.color ?? "#2563eb", fillOpacity: 1,
          });
        }
        if (m.label && m.permanent) cm.bindTooltip(m.label, { permanent: true, direction: "top", className: "vm-chip", opacity: 1 });
        else if (m.label) cm.bindTooltip(m.label, { direction: "top" });
        if (m.popup) cm.bindPopup(m.popup, { className: "vm-popup" });
        if (onMarkerClick) cm.on("click", () => onMarkerClick(m));
        cm.addTo(group);
        data.push(cm);
      }

      overlayRef.current?.remove();
      group.addTo(map);
      overlayRef.current = group;

      // Framing: "data" fits to the data. It fits ONCE on first paint, and again
      // whenever `fitKey` changes (e.g. a newly selected item) — the later fits
      // fly smoothly. When routes are present, prefer the routes' extent (a
      // selected trail from start → current) over the markers. Live updates that
      // don't change `fitKey` never move the map. "india"/"none" leave the view.
      const fitKeyChanged = fitKey !== undefined && fitKey !== lastFitKey.current;
      if (fitTo === "data" && (!fittedData.current || fitKeyChanged)) {
        const targetLayers = routeLayers.length ? routeLayers : data.length ? data : boundary;
        try {
          const bounds = L.featureGroup(targetLayers).getBounds();
          if (bounds.isValid()) {
            const animate = fittedData.current && fitKeyChanged;
            if (bounds.getSouthWest().equals(bounds.getNorthEast())) {
              // Every target point is identical (a stationary rep, a single
              // marker) → a ZERO-SIZE extent. fitBounds/flyToBounds then computes
              // a NaN zoom → NaN centre → Leaflet's maxBounds check throws async
              // ("Invalid LatLng (NaN, NaN)"), and the map never moves. Centre on
              // the point at a street zoom instead (Leaflet clamps to maxZoom).
              const center = bounds.getCenter();
              if (animate) map.flyTo(center, 15, { duration: 0.85, easeLinearity: 0.25 });
              else map.setView(center, 15);
            } else {
              // maxZoom caps a very tight cluster so it can't over-zoom into a NaN.
              const opts = { padding: [24, 24] as [number, number], maxZoom: 16 };
              if (animate) map.flyToBounds(bounds, { ...opts, duration: 0.85, easeLinearity: 0.25 });
              else map.fitBounds(bounds, opts);
            }
            fittedData.current = true;
            lastFitKey.current = fitKey;
          }
        } catch { /* no bounds yet */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, level, stateName, stateNamesKey, resolution, labels, markersKey, routesKey, fitTo, fitKey, dataKey]);

  return <div ref={ref} className={props.className} style={props.style ?? { height: 480, width: "100%" }} />;
}
