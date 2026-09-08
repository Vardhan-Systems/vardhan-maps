import { useMemo, type CSSProperties } from "react";
import { districts as allDistricts, states as allStates } from "../data";
import type { DistrictProps, StateProps } from "../data/types";
import { bboxOf } from "../core/geo";
import { featurePaths } from "../svg/paths";
import { fitProjection } from "../svg/project";
import type { PathStyle } from "../svg/render";

export interface IndiaSvgMapProps {
  width?: number;
  height?: number;
  padding?: number;
  level?: "state" | "district" | "both";
  /** Restrict districts to one state (level "district"/"both"). */
  stateName?: string;
  stateStyle?: PathStyle;
  districtStyle?: PathStyle;
  stateFill?: (name: string, props: StateProps) => string | undefined;
  districtFill?: (name: string, props: DistrictProps) => string | undefined;
  onStateClick?: (name: string, props: StateProps) => void;
  onDistrictClick?: (name: string, props: DistrictProps) => void;
  /** Show a native <title> tooltip per feature. Default true. */
  titles?: boolean;
  className?: string;
  style?: CSSProperties;
}

const S_STATE: Required<PathStyle> = { fill: "#e2e8f0", stroke: "#475569", strokeWidth: 1 };
const S_DISTRICT: Required<PathStyle> = { fill: "#f1f5f9", stroke: "#94a3b8", strokeWidth: 0.6 };

/** India as an inline, dependency-free SVG (no tiles). Good for choropleths. */
export function IndiaSvgMap(props: IndiaSvgMapProps) {
  const width = props.width ?? 900;
  const height = props.height ?? 1000;
  const level = props.level ?? "state";
  const titles = props.titles ?? true;
  const ss = { ...S_STATE, ...props.stateStyle };
  const ds = { ...S_DISTRICT, ...props.districtStyle };

  const districtFeatures = useMemo(
    () =>
      props.stateName
        ? allDistricts.features.filter(
            (f) => f.properties.state.toLowerCase() === props.stateName!.toLowerCase(),
          )
        : allDistricts.features,
    [props.stateName],
  );

  const projection = useMemo(() => {
    const frame =
      level === "district"
        ? { type: "FeatureCollection" as const, features: districtFeatures }
        : allStates;
    return fitProjection(bboxOf(frame), width, height, props.padding ?? 12);
  }, [level, districtFeatures, width, height, props.padding]);

  const districtPaths = useMemo(
    () => (level !== "state" ? featurePaths(districtFeatures, projection) : []),
    [level, districtFeatures, projection],
  );
  const statePaths = useMemo(
    () => (level !== "district" ? featurePaths(allStates.features, projection) : []),
    [level, projection],
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      className={props.className}
      style={props.style}
      role="img"
      aria-label="Map of India"
    >
      {districtPaths.map((p, i) => (
        <path
          key={`d${i}`}
          d={p.d}
          fill={props.districtFill?.(p.properties.name, p.properties) ?? ds.fill}
          stroke={ds.stroke}
          strokeWidth={ds.strokeWidth}
          strokeLinejoin="round"
          style={props.onDistrictClick ? { cursor: "pointer" } : undefined}
          onClick={props.onDistrictClick ? () => props.onDistrictClick!(p.properties.name, p.properties) : undefined}
        >
          {titles ? <title>{`${p.properties.name}, ${p.properties.state}`}</title> : null}
        </path>
      ))}
      {statePaths.map((p, i) => (
        <path
          key={`s${i}`}
          d={p.d}
          fill={props.stateFill?.(p.properties.name, p.properties) ?? (level === "both" ? "none" : ss.fill)}
          stroke={ss.stroke}
          strokeWidth={ss.strokeWidth}
          strokeLinejoin="round"
          style={props.onStateClick ? { cursor: "pointer" } : undefined}
          onClick={props.onStateClick ? () => props.onStateClick!(p.properties.name, p.properties) : undefined}
        >
          {titles && level !== "both" ? <title>{p.properties.name}</title> : null}
        </path>
      ))}
    </svg>
  );
}
