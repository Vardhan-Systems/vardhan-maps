import { districts as allDistricts, states as allStates } from "../data";
import type { DistrictProps, StateProps } from "../data/types";
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
  /** Restrict districts to one state (level "district"/"both"). */
  stateName?: string;
  stateStyle?: PathStyle;
  districtStyle?: PathStyle;
  /** Choropleth hook: return a fill for a given state (overrides stateStyle.fill). */
  stateFill?: (name: string, props: StateProps) => string | undefined;
  /** Choropleth hook: return a fill for a given district. */
  districtFill?: (name: string, props: DistrictProps) => string | undefined;
  /** Emit a <title> per feature so hovering shows its name. Default true. */
  titles?: boolean;
  /** class attribute on the root <svg>. */
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
 * no dependencies. Suitable for choropleths, infographics, server-side rendering.
 */
export function renderIndiaSvg(options: RenderIndiaSvgOptions = {}): string {
  const width = options.width ?? 900;
  const height = options.height ?? 1000;
  const level = options.level ?? "state";
  const titles = options.titles ?? true;

  const stateStyle = { ...DEFAULT_STATE, ...options.stateStyle };
  const districtStyle = { ...DEFAULT_DISTRICT, ...options.districtStyle };

  const districtFeatures = options.stateName
    ? allDistricts.features.filter(
        (f) => f.properties.state.toLowerCase() === options.stateName!.toLowerCase(),
      )
    : allDistricts.features;

  // Frame to the full country for state/both; to the chosen districts otherwise.
  const frameFc =
    level === "district"
      ? { type: "FeatureCollection" as const, features: districtFeatures }
      : allStates;
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
    // On "both", states draw as outlines on top (transparent fill).
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
