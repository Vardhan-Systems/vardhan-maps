import { renderIndiaSvg } from "../svg";
import { loadAllDistricts, loadDistricts } from "../data";
import { buildColorScale } from "./color-scale";
import type { VardhanMapSpec } from "./types";

export interface RenderSpecSvgOptions {
  width?: number;
  height?: number;
}

/**
 * Render a spec to a dependency-free SVG string — the static preview (e.g. an
 * inline image in a chat). Shows boundaries + choropleth fills with hover titles;
 * markers/routes are drawn only by the interactive renderer, so they don't appear
 * here (use the interactive map for those). Async because district geometry loads
 * lazily.
 */
export async function renderSpecToSvg(
  spec: VardhanMapSpec,
  opts: RenderSpecSvgOptions = {},
): Promise<string> {
  const level: "state" | "district" = spec.map.region === "india" ? "state" : "district";
  const values = new Map((spec.data ?? []).map((d) => [d.key.trim().toLowerCase(), d.value]));
  const scale = buildColorScale([...values.values()], spec.options?.colors);
  const fillFor = (name: string) => {
    const v = values.get(name.trim().toLowerCase());
    return v === undefined ? undefined : scale.colorFor(v);
  };

  let districts: { features: Awaited<ReturnType<typeof loadDistricts>> } | undefined;
  let stateName = spec.map.state;
  if (level === "district") {
    if (spec.map.state && !spec.map.states) {
      // loadDistricts returns a features array — wrap it for renderIndiaSvg.
      districts = { features: await loadDistricts(spec.map.state) };
    } else {
      districts = await loadAllDistricts();
      stateName = undefined; // several / all states → don't restrict to one
    }
  }

  return renderIndiaSvg({
    level,
    districts,
    stateName,
    width: opts.width ?? 900,
    height: opts.height,
    titles: spec.options?.tooltip !== false,
    stateFill: level === "state" ? (name) => fillFor(name) : undefined,
    districtFill: level === "district" ? (name) => fillFor(name) : undefined,
  });
}
