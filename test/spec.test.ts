import { describe, expect, it } from "vitest";
import {
  validateSpec,
  buildColorScale,
  specToLeafletProps,
  renderSpecToSvg,
  type VardhanMapSpec,
} from "../src/spec";

const choropleth = (over: Partial<VardhanMapSpec> = {}): VardhanMapSpec => ({
  version: "1",
  map: { region: "india" },
  visualization: "choropleth",
  data: [
    { key: "Telangana", value: 72 },
    { key: "Karnataka", value: 84 },
    { key: "Andhra Pradesh", value: 61 },
  ],
  ...over,
});

describe("validateSpec", () => {
  it("accepts a well-formed choropleth", () => {
    expect(validateSpec(choropleth())).toEqual([]);
  });
  it("rejects a non-object / wrong version / bad region / bad visualization", () => {
    expect(validateSpec(null).length).toBe(1);
    expect(validateSpec({ ...choropleth(), version: "2" }).some((e) => e.path === "version")).toBe(true);
    expect(validateSpec({ ...choropleth(), map: { region: "moon" } }).some((e) => e.path === "map.region")).toBe(true);
    expect(validateSpec({ ...choropleth(), visualization: "pie" }).some((e) => e.path === "visualization")).toBe(true);
  });
  it("requires data for choropleth/heatmap", () => {
    expect(validateSpec({ ...choropleth(), data: [] }).some((e) => e.path === "data")).toBe(true);
    expect(validateSpec({ version: "1", map: { region: "india" }, visualization: "heatmap" }).some((e) => e.path === "data")).toBe(true);
  });
  it("flags bad datum key/value", () => {
    const errs = validateSpec({ ...choropleth(), data: [{ key: "", value: Number.NaN }] });
    expect(errs.some((e) => e.path === "data[0].key")).toBe(true);
    expect(errs.some((e) => e.path === "data[0].value")).toBe(true);
  });
  it("requires markers/routes for their visualizations, with valid geometry", () => {
    expect(validateSpec({ version: "1", map: { region: "india" }, visualization: "markers" }).some((e) => e.path === "markers")).toBe(true);
    expect(validateSpec({ version: "1", map: { region: "india" }, visualization: "routes" }).some((e) => e.path === "routes")).toBe(true);
    const badMarker = validateSpec({ version: "1", map: { region: "india" }, visualization: "markers", markers: [{ lat: "x" as unknown as number, lng: 78 }] });
    expect(badMarker.some((e) => e.path === "markers[0]")).toBe(true);
    const badRoute = validateSpec({ version: "1", map: { region: "india" }, visualization: "routes", routes: [{ points: [{ lat: 1, lng: 2 }] }] });
    expect(badRoute.some((e) => e.path === "routes[0].points")).toBe(true);
  });
});

describe("buildColorScale", () => {
  it("exposes min/max and buckets values low→high", () => {
    const s = buildColorScale([10, 20, 30]);
    expect([s.min, s.max]).toEqual([10, 30]);
    expect(s.colorFor(10)).not.toBe(s.colorFor(30));
  });
  it("maps everything to the top colour when all values are equal", () => {
    const s = buildColorScale([5, 5, 5], ["#a", "#b", "#c"]);
    expect(s.colorFor(5)).toBe("#c");
  });
  it("falls back for empty values / non-finite input / empty ramp", () => {
    expect(buildColorScale([]).colorFor(1)).toBe("#eff6ff");
    expect(buildColorScale([1, 2]).colorFor(Number.NaN)).toBe("#eff6ff");
    expect(buildColorScale([1, 2], []).colorFor(2)).toBeTypeOf("string");
  });
});

describe("specToLeafletProps", () => {
  it("india choropleth → state level with a data-driven stateFill", () => {
    const p = specToLeafletProps(choropleth());
    expect(p.level).toBe("state");
    expect(p.stateFill?.("Telangana", {} as never)).toMatchObject({ fillColor: expect.any(String), fillOpacity: 0.8 });
    expect(p.stateFill?.("Nowhere", {} as never)).toBeUndefined();
    expect(p.districtFill).toBeUndefined();
  });
  it("state region → district level, focused + clipped", () => {
    const p = specToLeafletProps(choropleth({ map: { region: "state", state: "Telangana" }, data: [{ key: "Khammam", value: 42 }] }));
    expect(p.level).toBe("district");
    expect(p.stateName).toBe("Telangana");
    expect(p.clipToStates).toBe(true);
    expect(p.districtFill?.("Khammam", {} as never)).toMatchObject({ fillColor: expect.any(String) });
  });
  it("markers pass through and fit-to-data", () => {
    const p = specToLeafletProps({ version: "1", map: { region: "india" }, visualization: "markers", markers: [{ lat: 17, lng: 78, label: "HQ" }] });
    expect(p.markers).toHaveLength(1);
    expect(p.fitTo).toBe("data");
  });
  it("honours basemap + tooltip options", () => {
    expect(specToLeafletProps(choropleth({ options: { basemap: "none", tooltip: false } }))).toMatchObject({ vector: false, tiles: false, boundaryTooltips: false });
    expect(specToLeafletProps(choropleth({ options: { basemap: "raster" } }))).toMatchObject({ vector: false, tiles: true });
  });
});

describe("renderSpecToSvg", () => {
  it("renders an india choropleth to an SVG string", async () => {
    const svg = await renderSpecToSvg(choropleth());
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });
  it("renders a single state's districts", async () => {
    const svg = await renderSpecToSvg(choropleth({ map: { region: "state", state: "Telangana" }, data: [{ key: "Khammam", value: 42 }] }));
    expect(svg).toContain("<svg");
  });
});
