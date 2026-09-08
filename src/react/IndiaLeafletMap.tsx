import { useEffect, useRef, useState, type CSSProperties } from "react";
import type * as LType from "leaflet";
import type { GeoJsonObject } from "geojson";
import { indiaOutline, loadAllDistricts, loadDistricts, states as allStates, type Resolution } from "../data";
import { bboxOf } from "../core/geo";
import type { DistrictProps, StateProps } from "../data/types";

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
  /** District resolution to lazy-load — "low" (default) or "high". */
  resolution?: Resolution;
  /** Show OSM raster tiles under the boundaries. Default true. */
  tiles?: boolean;
  tileUrl?: string;
  tileAttribution?: string;
  stateStyle?: LType.PathOptions;
  districtStyle?: LType.PathOptions;
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
  /** Lock panning/zooming to India (hard bounds + min zoom). Default true. */
  lockToIndia?: boolean;
  /** Grey-out everything outside India's borders. Default true. */
  mask?: boolean;
  /** Colour of the outside-India mask. Default light grey. */
  maskColor?: string;
  /** Override the attribution-control prefix (defaults to Leaflet's own). */
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
    .leaflet-tooltip.vm-chip {
      background:#2563eb;color:#fff;border:none;border-radius:9999px;padding:2px 8px;
      font:600 11px system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.35);white-space:nowrap;
    }
    .leaflet-tooltip.vm-chip::before{display:none}
  `;
  document.head.appendChild(el);
}

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
  const { stateName, tiles, tileUrl, labels, markers, routes, onStateClick, onDistrictClick, onMarkerClick } = props;
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

      const bounds = L.latLngBounds(IN_BOUNDS).pad(0.03);
      const map = L.map(el, {
        scrollWheelZoom: true,
        maxBounds: lock ? bounds : undefined,
        maxBoundsViscosity: lock ? 1 : 0,
      });
      if (props.center) map.setView(props.center, props.zoom ?? 5);
      else map.fitBounds(bounds);
      if (lock) map.setMinZoom(map.getBoundsZoom(bounds));

      // Keep Leaflet's default attribution unless the consumer overrides the prefix.
      if (props.attributionPrefix != null) map.attributionControl.setPrefix(props.attributionPrefix);
      if (tiles !== false) {
        L.tileLayer(tileUrl ?? OSM_URL, { attribution: props.tileAttribution ?? OSM_ATTR, maxZoom: 19 }).addTo(map);
      }

      // Grey-out everything outside India: a world rectangle with India punched
      // out as holes (Leaflet's default evenodd fill-rule makes inner rings holes).
      if (props.mask ?? true) {
        const world: number[][] = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
        const holes = asMP(indiaOutline.geometry).map((poly) => poly[0]);
        L.geoJSON({ type: "Polygon", coordinates: [world, ...holes] } as unknown as GeoJsonObject, {
          interactive: false,
          style: { stroke: false, weight: 0, fillColor: props.maskColor ?? "#e5e7eb", fillOpacity: 0.92 },
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
        const feats = stateName
          ? await loadDistricts(stateName, { resolution })
          : (await loadAllDistricts({ resolution })).features;
        if (cancelled) return;
        boundary.push(
          L.geoJSON({ type: "FeatureCollection", features: feats } as unknown as GeoJsonObject, {
            style: props.districtStyle ?? {
              color: "#94a3b8", weight: 0.8, fillColor: "#f1f5f9", fillOpacity: level === "both" ? 0 : 0.5,
            },
            onEachFeature: (f, layer) => {
              const p = f.properties as DistrictProps;
              if (labels) layer.bindTooltip(p.name, { permanent: true, direction: "center", className: "vm-label", opacity: 1 });
              else layer.bindTooltip(`${p.name}, ${p.state}`, { sticky: true });
              if (onDistrictClick) layer.on("click", () => onDistrictClick(p.name, p));
            },
          }),
        );
      }
      if (level !== "district") {
        boundary.push(
          L.geoJSON({ type: "FeatureCollection", features: allStates.features } as unknown as GeoJsonObject, {
            style: props.stateStyle ?? {
              color: "#475569", weight: 1, fillColor: "#e2e8f0", fillOpacity: level === "both" ? 0 : 0.4,
            },
            onEachFeature: (f, layer) => {
              const p = f.properties as StateProps;
              if (labels) layer.bindTooltip(p.name, { permanent: true, direction: "center", className: "vm-label", opacity: 1 });
              else if (level !== "both") layer.bindTooltip(p.name, { sticky: true });
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
  }, [ready, level, stateName, resolution, labels, markersKey, routesKey, fitTo]);

  return <div ref={ref} className={props.className} style={props.style ?? { height: 480, width: "100%" }} />;
}
