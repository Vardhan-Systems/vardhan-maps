import { useEffect, useRef, type CSSProperties } from "react";
import type * as LType from "leaflet";
import type { GeoJsonObject } from "geojson";
import { loadAllDistricts, loadDistricts, states as allStates, type Resolution } from "../data";
import type { DistrictProps, StateProps } from "../data/types";

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
  onStateClick?: (name: string, props: StateProps) => void;
  onDistrictClick?: (name: string, props: DistrictProps) => void;
  className?: string;
  style?: CSSProperties;
}

const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * India on a Leaflet slippy map (OSM tiles by default) with the state/district
 * boundaries overlaid. `leaflet` is an optional peer dependency, imported lazily
 * (SSR-safe); districts are also lazy-loaded. Import "leaflet/dist/leaflet.css".
 */
export function IndiaLeafletMap(props: IndiaLeafletMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);

  const level = props.level ?? "state";
  const resolution = props.resolution ?? "low";
  const { stateName, tiles, tileUrl, onStateClick, onDistrictClick } = props;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mod = await import("leaflet");
      const L = ((mod as { default?: typeof LType }).default ?? mod) as typeof LType;
      if (cancelled || !ref.current || mapRef.current) return;

      const map = L.map(ref.current, { scrollWheelZoom: true });
      mapRef.current = map;

      if (tiles !== false) {
        L.tileLayer(tileUrl ?? OSM_URL, { attribution: props.tileAttribution ?? OSM_ATTR, maxZoom: 19 }).addTo(map);
      }

      const layers: LType.Layer[] = [];

      if (level !== "state") {
        const feats = stateName
          ? await loadDistricts(stateName, { resolution })
          : (await loadAllDistricts({ resolution })).features;
        if (cancelled) return;
        layers.push(
          L.geoJSON({ type: "FeatureCollection", features: feats } as unknown as GeoJsonObject, {
            style: props.districtStyle ?? {
              color: "#94a3b8", weight: 0.8, fillColor: "#f1f5f9", fillOpacity: level === "both" ? 0 : 0.5,
            },
            onEachFeature: (f, layer) => {
              const p = f.properties as DistrictProps;
              layer.bindTooltip(`${p.name}, ${p.state}`, { sticky: true });
              if (onDistrictClick) layer.on("click", () => onDistrictClick(p.name, p));
            },
          }).addTo(map),
        );
      }
      if (level !== "district") {
        layers.push(
          L.geoJSON({ type: "FeatureCollection", features: allStates.features } as unknown as GeoJsonObject, {
            style: props.stateStyle ?? {
              color: "#475569", weight: 1, fillColor: "#e2e8f0", fillOpacity: level === "both" ? 0 : 0.4,
            },
            onEachFeature: (f, layer) => {
              const p = f.properties as StateProps;
              if (level !== "both") layer.bindTooltip(p.name, { sticky: true });
              if (onStateClick) layer.on("click", () => onStateClick(p.name, p));
            },
          }).addTo(map),
        );
      }

      try {
        map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [10, 10] });
      } catch {
        map.setView([22.5, 80], 5);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, stateName, resolution, tiles, tileUrl]);

  return <div ref={ref} className={props.className} style={props.style ?? { height: 480, width: "100%" }} />;
}
