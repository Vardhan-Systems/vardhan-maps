import { describe, expect, it } from "vitest";
import { renderIndiaSvg } from "../src/svg";
import { fitProjection } from "../src/svg/project";
import { loadAllDistricts } from "../src/data";

describe("renderIndiaSvg", () => {
  it("renders a state map with one path per state", () => {
    const svg = renderIndiaSvg({ level: "state", width: 400, height: 440 });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 400 440"');
    expect((svg.match(/<path/g) ?? []).length).toBe(36);
  });
  it("applies the choropleth fill hook", () => {
    const svg = renderIndiaSvg({ level: "state", stateFill: (n) => (n === "Kerala" ? "#123456" : undefined) });
    expect(svg).toContain('fill="#123456"');
  });
  it("throws when a district level is missing data", () => {
    expect(() => renderIndiaSvg({ level: "district" })).toThrow(/needs district data/);
  });
  it("renders districts + states when data is supplied", async () => {
    const districts = await loadAllDistricts();
    const svg = renderIndiaSvg({ level: "both", districts, width: 400, height: 440 });
    expect((svg.match(/<path/g) ?? []).length).toBe(36 + 787);
  });
  it("escapes titles safely", () => {
    const svg = renderIndiaSvg({ level: "state" });
    expect(svg).not.toContain("<title><"); // no raw markup leaked into titles
  });
});

describe("fitProjection", () => {
  it("keeps projected points inside the padded box", () => {
    const p = fitProjection([70, 8, 90, 30], 200, 300, 10);
    for (const [lng, lat] of [[70, 8], [90, 30], [80, 19]]) {
      const [x, y] = p.project(lng, lat);
      expect(x).toBeGreaterThanOrEqual(9);
      expect(x).toBeLessThanOrEqual(191);
      expect(y).toBeGreaterThanOrEqual(9);
      expect(y).toBeLessThanOrEqual(291);
    }
  });
  it("flips latitude (north is up)", () => {
    const p = fitProjection([70, 8, 90, 30], 200, 300, 0);
    expect(p.project(80, 30)[1]).toBeLessThan(p.project(80, 8)[1]);
  });
});
