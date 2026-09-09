import { useEffect, useRef, useState, type CSSProperties } from "react";
import type * as LType from "leaflet";
import type { GeoJsonObject } from "geojson";
import { indiaOutline, loadAllDistricts, loadDistricts, states as allStates, type Resolution } from "../data";
import { bboxOf } from "../core/geo";
import type { DistrictProps, StateProps } from "../data/types";
import type { VectorStyle } from "./vector";

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
  /** Override the attribution-control prefix (defaults to Leaflet's own). Pass "" to remove it. */
  attributionPrefix?: string;
  onStateClick?: (name: string, props: StateProps) => void;
  onDistrictClick?: (name: string, props: DistrictProps) => void;
  onMarkerClick?: (marker: MapMarker) => void;
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
  const [ready, setReady] = useState(0);

  const level = props.level ?? "state";
  const resolution = props.resolution ?? "low";
  const lock = props.lockToIndia ?? true;
  const fitTo = props.fitTo ?? (lock ? "india" : "data");
  const {
    stateName, stateNames, tiles, tileUrl, labels, markers, routes, dataKey,
    districtFill, stateFill, districtTooltip, stateTooltip, boundaryTooltips,
    onStateClick, onDistrictClick, onMarkerClick,
  } = props;
  const showNameTip = boundaryTooltips !== false;
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
      if (props.vectorStyle) {
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
          (L as unknown as { maplibreGL: (o: Record<string, unknown>) => LType.Layer })
            .maplibreGL({ style: props.vectorStyle, attribution: props.tileAttribution ?? OSM_ATTR })
            .addTo(map);
        } catch (err) {
          // Missing peers or a bad style shouldn't blank the whole map — the
          // boundaries/markers still render on a plain background.
          if (typeof console !== "undefined") console.error("[vardhan-maps] vector basemap failed:", err);
        }
      } else if (tiles !== false) {
        L.tileLayer(tileUrl ?? OSM_URL, { attribution: props.tileAttribution ?? OSM_ATTR, maxZoom: 19 }).addTo(map);
      }

      // Grey-out everything outside the region: a world rectangle with the region
      // punched out as holes (Leaflet's default evenodd fill-rule makes inner rings
      // holes). Region = the named states' union if `maskStates` is given, else India.
      if (props.mask ?? true) {
        const world: number[][] = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
        let holes: number[][][];
        if (props.maskStates?.length) {
          const want = new Set(props.maskStates);
          const feats = allStates.features.filter((f) => want.has((f.properties as StateProps).name));
          holes = feats.flatMap((f) => asMP(f.geometry as typeof indiaOutline.geometry).map((poly) => poly[0]));
        } else {
          holes = asMP(indiaOutline.geometry).map((poly) => poly[0]);
        }
        L.geoJSON({ type: "Polygon", coordinates: [world, ...holes] } as unknown as GeoJsonObject, {
          interactive: false,
          style: { stroke: false, weight: 0, fillColor: props.maskColor ?? "#e5e7eb", fillOpacity: props.maskOpacity ?? 0.92 },
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
        boundary.push(
          L.geoJSON({ type: "FeatureCollection", features: allStates.features } as unknown as GeoJsonObject, {
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
      const data: LType.Layer[] = [];
      for (const r of routes ?? []) {
        if (r.points.length >= 2) {
          const line = L.polyline(r.points.map((p) => [p.lat, p.lng]), {
            color: r.color ?? "#2563eb", weight: r.weight ?? 3, opacity: r.opacity ?? 0.9,
          });
          if (r.label) line.bindTooltip(r.label, { sticky: true });
          line.addTo(group);
          data.push(line);
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
          }
        }
      }
      // Your own points. `permanent` shows the label as an always-on chip.
      for (const m of markers ?? []) {
        const cm = L.circleMarker([m.lat, m.lng], {
          radius: m.radius ?? 5, color: "#ffffff", weight: 1.5, fillColor: m.color ?? "#2563eb", fillOpacity: 1,
        });
        if (m.label && m.permanent) cm.bindTooltip(m.label, { permanent: true, direction: "top", className: "vm-chip", opacity: 1 });
        else if (m.label) cm.bindTooltip(m.label, { direction: "top" });
        if (onMarkerClick) cm.on("click", () => onMarkerClick(m));
        cm.addTo(group);
        data.push(cm);
      }

      overlayRef.current?.remove();
      group.addTo(map);
      overlayRef.current = group;

      // Framing: "data" fits to markers/routes ONCE (live updates don't re-zoom);
      // "india"/"none" leave the view set by the create effect.
      if (fitTo === "data" && !fittedData.current) {
        const target = data.length ? L.featureGroup(data) : L.featureGroup(boundary);
        try {
          map.fitBounds(target.getBounds(), { padding: [24, 24] });
          fittedData.current = true;
        } catch { /* no bounds yet */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, level, stateName, stateNamesKey, resolution, labels, markersKey, routesKey, fitTo, dataKey]);

  return <div ref={ref} className={props.className} style={props.style ?? { height: 480, width: "100%" }} />;
}
