import { describe, expect, it } from "vitest";
import {
  boundsFromLeaflet,
  dataBounds,
  markersFC,
  maskFeature,
  routeLinesFC,
  routePointsFC,
  stampBoundaries,
} from "../src/react-native/geometry";

describe("react-native geometry", () => {
  it("converts Leaflet [[S,W],[N,E]] bounds → MapLibre [W,S,E,N]", () => {
    expect(boundsFromLeaflet([[16, 77], [19, 81]])).toEqual([77, 16, 81, 19]);
  });

  it("prefers the routes' extent over markers for the fit", () => {
    const markers = [{ lat: 0, lng: 0 }];
    const routes = [{ points: [{ lat: 10, lng: 20 }, { lat: 12, lng: 24 }] }];
    expect(dataBounds(markers, routes)).toEqual([20, 10, 24, 12]);
    expect(dataBounds(markers, [])).toEqual([0, 0, 0, 0]);
    expect(dataBounds([], [])).toBeNull();
  });

  it("stamps marker points with index + style props", () => {
    const fc = markersFC([{ lat: 17, lng: 78, label: "A", permanent: true, color: "#0f0", radius: 7 }]);
    const p = fc.features[0].properties as Record<string, unknown>;
    expect(fc.features[0].geometry).toEqual({ type: "Point", coordinates: [78, 17] });
    expect(p).toMatchObject({ _idx: 0, color: "#0f0", radius: 7, label: "A", permanent: 1 });
  });

  it("builds route lines (>=2 pts) and per-ping dots only when showPoints", () => {
    const routes = [
      { points: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }], showPoints: true, pointColor: "#f00" },
      { points: [{ lat: 3, lng: 3 }] }, // too short → no line
    ];
    expect(routeLinesFC(routes).features).toHaveLength(1);
    expect(routePointsFC(routes).features).toHaveLength(2);
    expect(routePointsFC([{ points: [{ lat: 1, lng: 1 }] }]).features).toHaveLength(0);
  });

  it("stamps boundary style, letting the fill fn override the base", () => {
    const base = { color: "#111", weight: 1, opacity: 1, fill: false, fillColor: "#000", fillOpacity: 0 } as const;
    const feats = [{ type: "Feature", geometry: { type: "Point", coordinates: [0, 0] }, properties: { name: "X" } }] as GeoJSON.Feature[];
    const out = stampBoundaries(feats, base, (name) => (name === "X" ? { fill: true, fillColor: "#abc", fillOpacity: 0.4 } : undefined));
    expect(out.features[0].properties).toMatchObject({ _lc: "#111", _fc: "#abc", _fo: 0.4 });
  });

  it("builds a mask polygon (world ring + region holes)", () => {
    const f = maskFeature(["Telangana"]);
    const poly = f.geometry as GeoJSON.Polygon;
    expect(poly.type).toBe("Polygon");
    expect(poly.coordinates.length).toBeGreaterThan(1); // world + >=1 hole
    expect(poly.coordinates[0][0]).toEqual([-180, -85]); // world ring first
  });
});
