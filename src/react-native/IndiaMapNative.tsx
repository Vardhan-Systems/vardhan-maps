import { useEffect, useMemo, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import { Camera, GeoJSONSource, Layer, Map } from "@maplibre/maplibre-react-native";
import type {
  CameraProps,
  CircleLayerSpecification,
  FillLayerSpecification,
  FilterSpecification,
  LineLayerSpecification,
  PressEventWithFeatures,
  SymbolLayerSpecification,
} from "@maplibre/maplibre-react-native";
import { loadAllDistricts, loadDistricts } from "../data";
import { getStates } from "../data";
import { vectorBasemapStyle } from "../react/vector";
import {
  boundsFromLeaflet,
  dataBounds,
  markersFC,
  maskFeature,
  routeLinesFC,
  routePointsFC,
  stampBoundaries,
} from "./geometry";
import type { BoundaryStyle, IndiaMapNativeProps } from "./types";

const FONT = ["Noto Sans Regular"];

function base(s: BoundaryStyle | undefined, d: Required<BoundaryStyle>): Required<BoundaryStyle> {
  return {
    color: s?.color ?? d.color,
    weight: s?.weight ?? d.weight,
    opacity: s?.opacity ?? d.opacity,
    fill: s?.fill ?? d.fill,
    fillColor: s?.fillColor ?? d.fillColor,
    fillOpacity: s?.fillOpacity ?? d.fillOpacity,
  };
}
const STATE_D: Required<BoundaryStyle> = { color: "#475569", weight: 1, opacity: 1, fill: false, fillColor: "#000000", fillOpacity: 0 };
const DIST_D: Required<BoundaryStyle> = { color: "#94a3b8", weight: 0.6, opacity: 0.7, fill: false, fillColor: "#000000", fillOpacity: 0 };

// Data-driven paint: per-feature style read from stamped properties. Cast to the
// spec paint type (the `["get", …]` array literals are valid MapLibre expressions).
const linePaint = {
  "line-color": ["get", "_lc"], "line-width": ["get", "_lw"], "line-opacity": ["get", "_lo"],
} as LineLayerSpecification["paint"];
const fillPaint = {
  "fill-color": ["get", "_fc"], "fill-opacity": ["get", "_fo"],
} as FillLayerSpecification["paint"];
const circlePaint = {
  "circle-radius": ["get", "radius"], "circle-color": ["get", "color"],
} as CircleLayerSpecification["paint"];
const markerCirclePaint = {
  "circle-radius": ["get", "radius"], "circle-color": ["get", "color"],
  "circle-stroke-color": "#ffffff", "circle-stroke-width": 2,
} as CircleLayerSpecification["paint"];
const labelLayout = (size: number): SymbolLayerSpecification["layout"] =>
  ({ "text-field": ["get", "name"], "text-font": FONT, "text-size": size }) as SymbolLayerSpecification["layout"];
const labelPaint = {
  "text-color": "#3d4043", "text-halo-color": "#ffffff", "text-halo-width": 1.3,
} as SymbolLayerSpecification["paint"];

/**
 * React Native (MapLibre Native) twin of `IndiaLeafletMap` — the self-hosted grey
 * vector basemap (pmtiles, rendered natively) under India state/district
 * boundaries, an outside-region mask, choropleth fills, markers and route
 * polylines. Same data + `vectorBasemapStyle()` as the web renderer; only the
 * engine differs. Needs the peers `@maplibre/maplibre-react-native` + `react-native`.
 */
export function IndiaMapNative(props: IndiaMapNativeProps) {
  const {
    level = "state", stateName, stateNames, resolution, vector, vectorStyle,
    stateStyle, districtStyle, districtFill, stateFill, dataKey,
    markers, routes, fitTo, fitKey, fitDuration, fitEasing, center, zoom, labels,
    logo, attribution, compass,
    mask = true, maskStates, maskColor, maskOpacity, lockBounds, minZoom,
    onStateClick, onDistrictClick, onMarkerClick, style,
  } = props;

  const mapStyle = useMemo(() => {
    const s = vectorStyle ?? vectorBasemapStyle();
    void vector; // basemap is always the vector style; `vector` kept for API parity
    return typeof s === "string" ? s : JSON.stringify(s);
  }, [vectorStyle, vector]);

  const stateBase = base(stateStyle, STATE_D);
  const distBase = base(districtStyle, DIST_D);

  const statesFC = useMemo(
    () => (level === "district" ? null : stampBoundaries(getStates() as GeoJSON.Feature[], stateBase, stateFill)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, dataKey, stateStyle, stateFill],
  );
  const stateHasFill = !!stateFill || stateBase.fill;

  const [districtFC, setDistrictFC] = useState<GeoJSON.FeatureCollection | null>(null);
  useEffect(() => {
    if (level === "state") { setDistrictFC(null); return; }
    let cancelled = false;
    void (async () => {
      const names = stateNames ?? (stateName ? [stateName] : null);
      const feats = names
        ? (await Promise.all(names.map((n) => loadDistricts(n, { resolution }).catch(() => [])))).flat()
        : (await loadAllDistricts({ resolution })).features;
      if (!cancelled) setDistrictFC(stampBoundaries(feats as GeoJSON.Feature[], distBase, districtFill));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, stateName, (stateNames ?? []).join("|"), resolution, dataKey]);
  const distHasFill = !!districtFill || distBase.fill;

  const maskFeat = useMemo(() => (mask ? maskFeature(maskStates) : null), [mask, (maskStates ?? []).join("|")]);
  const lineFC = useMemo(() => routeLinesFC(routes ?? []), [routes]);
  const pointFC = useMemo(() => routePointsFC(routes ?? []), [routes]);
  const markFC = useMemo(() => markersFC(markers ?? []), [markers]);

  // Fit extent captured when fitKey changes (fit once per selection, like web).
  const fitB = useMemo(
    () => (fitTo === "data" ? dataBounds(markers, routes) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fitKey, fitTo],
  );
  const lockB = lockBounds ? boundsFromLeaflet(lockBounds) : null;
  const camBounds = fitB ?? (center ? null : lockB);
  const lock = { ...(lockB ? { maxBounds: lockB } : {}), ...(minZoom !== undefined ? { minZoom } : {}) };
  const pad = { top: 24, right: 24, bottom: 24, left: 24 };
  // A re-fit (fitKey changed) animates with a curved "fly" by default — the RN
  // twin of the web's Leaflet flyToBounds — over `fitDuration` (900ms default).
  // The very first fit (fitKey undefined) is instant so the map doesn't fly in.
  const cameraProps: CameraProps = camBounds
    ? {
        bounds: camBounds,
        padding: pad,
        duration: fitKey === undefined ? 0 : (fitDuration ?? 900),
        easing: fitEasing ?? "fly",
        ...lock,
      }
    : center
      ? { center: [center[1], center[0]], zoom: zoom ?? 6, ...lock }
      : lock;

  const press = (cb?: (name: string, props: Record<string, unknown>) => void) =>
    (e: NativeSyntheticEvent<PressEventWithFeatures>) => {
      const f = e.nativeEvent.features?.[0];
      if (f && cb) cb(String((f.properties as { name?: string })?.name ?? ""), (f.properties ?? {}) as Record<string, unknown>);
    };
  const markPress = (e: NativeSyntheticEvent<PressEventWithFeatures>) => {
    const i = (e.nativeEvent.features?.[0]?.properties as { _idx?: number })?._idx;
    if (typeof i === "number" && markers?.[i]) onMarkerClick?.(markers[i]);
  };

  return (
    <Map
      mapStyle={mapStyle}
      style={style ?? { flex: 1 }}
      logo={logo}
      attribution={attribution}
      compass={compass}
    >
      <Camera {...cameraProps} />

      {maskFeat ? (
        <GeoJSONSource id="vm-mask" data={maskFeat}>
          <Layer type="fill" source="vm-mask" id="vm-mask-fill"
            paint={{ "fill-color": maskColor ?? "#e5e7eb", "fill-opacity": maskOpacity ?? 0.6 }} />
        </GeoJSONSource>
      ) : null}

      {statesFC ? (
        <GeoJSONSource id="vm-states" data={statesFC} onPress={press(onStateClick)}>
          {stateHasFill ? <Layer type="fill" source="vm-states" id="vm-states-fill" paint={fillPaint} /> : null}
          <Layer type="line" source="vm-states" id="vm-states-line" paint={linePaint} />
          {labels ? (
            <Layer type="symbol" source="vm-states" id="vm-states-label" layout={labelLayout(12)} paint={labelPaint} />
          ) : null}
        </GeoJSONSource>
      ) : null}

      {districtFC ? (
        <GeoJSONSource id="vm-districts" data={districtFC} onPress={press(onDistrictClick)}>
          {distHasFill ? <Layer type="fill" source="vm-districts" id="vm-districts-fill" paint={fillPaint} /> : null}
          <Layer type="line" source="vm-districts" id="vm-districts-line" paint={linePaint} />
          {labels ? (
            <Layer type="symbol" source="vm-districts" id="vm-districts-label" layout={labelLayout(10)} paint={labelPaint} />
          ) : null}
        </GeoJSONSource>
      ) : null}

      <GeoJSONSource id="vm-routes" data={lineFC}>
        <Layer type="line" source="vm-routes" id="vm-routes-line"
          layout={{ "line-cap": "round", "line-join": "round" }} paint={linePaint} />
      </GeoJSONSource>
      <GeoJSONSource id="vm-route-points" data={pointFC}>
        <Layer type="circle" source="vm-route-points" id="vm-route-points-c" paint={circlePaint} />
      </GeoJSONSource>

      <GeoJSONSource id="vm-markers" data={markFC} onPress={markPress}>
        <Layer type="circle" source="vm-markers" id="vm-markers-c" paint={markerCirclePaint} />
        <Layer type="symbol" source="vm-markers" id="vm-markers-label"
          filter={["==", ["get", "permanent"], 1] as FilterSpecification}
          layout={{
            "text-field": ["get", "label"], "text-font": FONT, "text-size": 11,
            "text-anchor": "top", "text-offset": [0, 0.8],
          } as SymbolLayerSpecification["layout"]}
          paint={{ "text-color": "#111827", "text-halo-color": "#ffffff", "text-halo-width": 1.4 } as SymbolLayerSpecification["paint"]} />
      </GeoJSONSource>
    </Map>
  );
}
