import { states as allStates } from "../data";
import type { DistrictCollection, DistrictProps, StateProps } from "../data/types";
import { bboxOf } from "../core/geo";
import { fitProjection } from "./project";
import { featurePaths } from "./paths";

export interface PathStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface RenderIndiaSvgOptions {
  width?: number;
  height?: number;
  padding?: number;
  /** Which boundaries to draw. Default "state". */
  level?: "state" | "district" | "both";
  /**
   * District data — REQUIRED when `level` is "district" or "both", since districts
   * are loaded lazily. Get it with `loadAllDistricts()` / `loadDistricts(state)`
   * from `vardhan-maps/data` and pass the result (or its `.features`) here.
   */
  districts?: DistrictCollection | { features: DistrictCollection["features"] };
  /** Restrict districts to one state. */
  stateName?: string;
  stateStyle?: PathStyle;
  districtStyle?: PathStyle;
  stateFill?: (name: string, props: StateProps) => string | undefined;
  districtFill?: (name: string, props: DistrictProps) => string | undefined;
  /** Emit a <title> per feature so hovering shows its name. Default true. */
  titles?: boolean;
  className?: string;
}

const DEFAULT_STATE: Required<PathStyle> = { fill: "#e2e8f0", stroke: "#475569", strokeWidth: 1 };
const DEFAULT_DISTRICT: Required<PathStyle> = { fill: "#f1f5f9", stroke: "#94a3b8", strokeWidth: 0.6 };

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

function pathEl(d: string, fill: string, stroke: string, w: number, title?: string): string {
  const t = title ? `<title>${esc(title)}</title>` : "";
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round">${t}</path>`;
}

/**
 * Render India (or one state's districts) to a standalone SVG string — no DOM,
 * no dependencies. States are bundled; pass district data via `options.districts`
 * for the "district"/"both" levels.
 */
export function renderIndiaSvg(options: RenderIndiaSvgOptions = {}): string {
  const width = options.width ?? 900;
  const height = options.height ?? 1000;
  const level = options.level ?? "state";
  const titles = options.titles ?? true;
  const stateStyle = { ...DEFAULT_STATE, ...options.stateStyle };
  const districtStyle = { ...DEFAULT_DISTRICT, ...options.districtStyle };

  let districtFeatures = options.districts?.features ?? [];
  if (options.stateName) {
    const n = options.stateName.toLowerCase();
    districtFeatures = districtFeatures.filter((f) => f.properties.state.toLowerCase() === n);
  }
  if ((level === "district" || level === "both") && districtFeatures.length === 0) {
    throw new Error(
      'renderIndiaSvg: level "' + level + '" needs district data — pass options.districts ' +
        "(from loadAllDistricts()/loadDistricts()).",
    );
  }

  const frameFc =
    level === "district" ? { type: "FeatureCollection" as const, features: districtFeatures } : allStates;
  const projection = fitProjection(bboxOf(frameFc), width, height, options.padding ?? 12);

  const parts: string[] = [];
  if (level === "district" || level === "both") {
    for (const { d, properties } of featurePaths(districtFeatures, projection)) {
      const fill = options.districtFill?.(properties.name, properties) ?? districtStyle.fill;
      parts.push(pathEl(d, fill, districtStyle.stroke, districtStyle.strokeWidth,
        titles ? `${properties.name}, ${properties.state}` : undefined));
    }
  }
  if (level === "state" || level === "both") {
    const stateFillDefault = level === "both" ? "none" : stateStyle.fill;
    for (const { d, properties } of featurePaths(allStates.features, projection)) {
      const fill = options.stateFill?.(properties.name, properties) ?? stateFillDefault;
      parts.push(pathEl(d, fill, stateStyle.stroke, stateStyle.strokeWidth,
        titles && level === "state" ? properties.name : undefined));
    }
  }

  const cls = options.className ? ` class="${esc(options.className)}"` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"${cls} ` +
    `role="img" aria-label="Map of India">${parts.join("")}</svg>`
  );
}
