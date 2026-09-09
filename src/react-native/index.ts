// React Native renderer (MapLibre Native). Parallels `vardhan-maps/react` but
// for RN: renders the same self-hosted vector basemap (pmtiles, resolved
// natively) + India boundaries/mask/markers/routes via @maplibre/maplibre-react-native.
export { IndiaMapNative } from "./IndiaMapNative";
export type {
  IndiaMapNativeProps,
  BoundaryStyle,
  MapMarker,
  MapRoute,
  MapRoutePoint,
  VectorStyle,
} from "./types";
// The basemap style builder is engine-agnostic — reuse it to customise the RN map.
export { vectorBasemapStyle, VARDHAN_TILES_ORIGIN } from "../react/vector";
export type { VectorBasemapOptions, GreyPalette } from "../react/vector";
