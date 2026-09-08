import { IndiaLeafletMap, type IndiaLeafletMapProps } from "./IndiaLeafletMap";
import { IndiaSvgMap, type IndiaSvgMapProps } from "./IndiaSvgMap";

export type IndiaMapProps =
  | ({ mode?: "svg" } & IndiaSvgMapProps)
  | ({ mode: "leaflet" } & IndiaLeafletMapProps);

/**
 * The one entry point: `mode="svg"` (default, dependency-free, tile-less) or
 * `mode="leaflet"` (OSM slippy map — needs the `leaflet` peer dep + its CSS).
 */
export function IndiaMap(props: IndiaMapProps) {
  if (props.mode === "leaflet") {
    const { mode: _mode, ...rest } = props;
    return <IndiaLeafletMap {...rest} />;
  }
  const { mode: _mode, ...rest } = props;
  return <IndiaSvgMap {...rest} />;
}
