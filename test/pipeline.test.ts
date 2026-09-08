import { describe, expect, it } from "vitest";
// @ts-expect-error — plain ESM pipeline helpers, no type declarations
import { simplifyRing, simplifyGeometry } from "../scripts/lib/rdp.mjs";
// @ts-expect-error — plain ESM pipeline helpers, no type declarations
import { pointOnSurface, stateAt, centroidOf } from "../scripts/lib/assign-state.mjs";

// A closed square ring with many redundant collinear points along each edge.
function denseSquare(): number[][] {
  const pts: number[][] = [];
  for (let x = 0; x <= 10; x++) pts.push([x, 0]);
  for (let y = 1; y <= 10; y++) pts.push([10, y]);
  for (let x = 9; x >= 0; x--) pts.push([x, 10]);
  for (let y = 9; y >= 0; y--) pts.push([0, y]);
  return pts; // first === last (0,0)
}

describe("simplifyRing", () => {
  it("collapses collinear points but keeps the ring closed", () => {
    const ring = denseSquare();
    const out = simplifyRing(ring, 0.001);
    expect(out.length).toBeLessThan(ring.length);
    expect(out.length).toBeGreaterThanOrEqual(4);
    expect(out[0]).toEqual(out[out.length - 1]);
  });
  it("simplifies a Polygon geometry", () => {
    const geom = { type: "Polygon", coordinates: [denseSquare()] };
    const s = simplifyGeometry(geom, 0.001);
    expect(s.type).toBe("Polygon");
    expect(s.coordinates[0].length).toBeLessThan(geom.coordinates[0].length);
  });
});

describe("state assignment helpers", () => {
  const square = {
    type: "Feature",
    properties: { name: "Squareland" },
    geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
  };
  it("pointOnSurface returns an interior point", () => {
    const [x, y] = pointOnSurface(square.geometry);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(10);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(10);
  });
  it("stateAt finds the containing state, or '' outside", () => {
    expect(stateAt(5, 5, [square])).toBe("Squareland");
    expect(stateAt(20, 20, [square])).toBe("");
  });
  it("centroidOf averages the ring", () => {
    const [x, y] = centroidOf(square.geometry);
    expect(x).toBeCloseTo(4, 0); // 5 vertices incl. repeat → slight bias, still central
    expect(y).toBeCloseTo(4, 0);
  });
});
