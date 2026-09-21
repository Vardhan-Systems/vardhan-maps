import { describe, expect, it } from "vitest";
import type { Feature } from "geojson";
import { buildBorderMesh } from "../src/react/border-mesh";

/** Two unit squares sharing the vertical edge x=1 (from (1,0) to (1,1)). */
const square = (name: string, x0: number): Feature => ({
  type: "Feature",
  properties: { name },
  geometry: {
    type: "Polygon",
    coordinates: [[[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1], [x0, 0]]],
  },
});
const A = square("A", 0);
const B = square("B", 1);

type MLS = { type: string; coordinates: number[][][] };
/** How many consecutive point-pairs across all lines equal the shared edge
 *  (1,0)–(1,1), in either direction — i.e. how many times it is drawn. */
const sharedEdgeCount = (m: MLS) => {
  const forward = JSON.stringify([[1, 0], [1, 1]]);
  const backward = JSON.stringify([[1, 1], [1, 0]]);
  let n = 0;
  for (const line of m.coordinates) {
    for (let i = 0; i < line.length - 1; i++) {
      const seg = JSON.stringify([line[i], line[i + 1]]);
      if (seg === forward || seg === backward) n++;
    }
  }
  return n;
};

describe("buildBorderMesh", () => {
  it("returns null for an empty feature list", async () => {
    expect(await buildBorderMesh([])).toBeNull();
  });

  it("collapses the shared edge to a single interior arc (interiorOnly)", async () => {
    const mesh = (await buildBorderMesh([A, B], true)) as unknown as MLS;
    expect(mesh.type).toBe("MultiLineString");
    // Only the one border the two squares share — drawn exactly once.
    expect(mesh.coordinates).toEqual([[[1, 0], [1, 1]]]);
  });

  it("draws the shared edge exactly once in the full mesh (no doubling)", async () => {
    const mesh = (await buildBorderMesh([A, B], false)) as unknown as MLS;
    expect(mesh.type).toBe("MultiLineString");
    expect(sharedEdgeCount(mesh)).toBe(1);
  });
});
