import type { Bbox } from "../core/geo";

/** Maps geographic [lng, lat] to SVG [x, y] within a fixed pixel box. */
export interface Projection {
  width: number;
  height: number;
  project(lng: number, lat: number): [number, number];
}

/**
 * Equirectangular projection fit to `bbox`, letterboxed into `width`×`height`
 * with `padding` px. Longitude is compressed by cos(midLat) so the country
 * keeps a natural aspect ratio (not stretched east–west). SVG y grows downward,
 * so latitude is flipped.
 */
export function fitProjection(
  bbox: Bbox,
  width: number,
  height: number,
  padding = 8,
): Projection {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const midLat = (minLat + maxLat) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180); // east–west compression

  const geoW = (maxLng - minLng) * kx || 1e-6;
  const geoH = (maxLat - minLat) || 1e-6;

  const availW = Math.max(1, width - padding * 2);
  const availH = Math.max(1, height - padding * 2);
  const scale = Math.min(availW / geoW, availH / geoH);

  // Centre the drawn area inside the box.
  const drawW = geoW * scale;
  const drawH = geoH * scale;
  const offsetX = padding + (availW - drawW) / 2;
  const offsetY = padding + (availH - drawH) / 2;

  return {
    width,
    height,
    project(lng: number, lat: number) {
      const x = offsetX + (lng - minLng) * kx * scale;
      const y = offsetY + (maxLat - lat) * scale; // flip Y
      return [x, y];
    },
  };
}
