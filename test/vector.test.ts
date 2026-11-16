import { describe, expect, it } from "vitest";
import {
  stateTilesUrl,
  HOSTED_STATE_TILES,
  VARDHAN_TILES_ORIGIN,
  vectorBasemapStyle,
} from "../src/react/vector";

describe("stateTilesUrl", () => {
  it("returns each hosted state's own .pmtiles URL", () => {
    expect(stateTilesUrl("Karnataka")).toBe(`${VARDHAN_TILES_ORIGIN}/beyond-karnataka.pmtiles`);
    expect(stateTilesUrl("Tamil Nadu")).toBe(`${VARDHAN_TILES_ORIGIN}/beyond-tamil-nadu.pmtiles`);
  });

  it("maps Telangana and Andhra Pradesh to the combined tgap tiles", () => {
    expect(stateTilesUrl("Telangana")).toBe(`${VARDHAN_TILES_ORIGIN}/beyond-tgap.pmtiles`);
    expect(stateTilesUrl("Andhra Pradesh")).toBe(`${VARDHAN_TILES_ORIGIN}/beyond-tgap.pmtiles`);
  });

  it("is case- and separator-insensitive on the state name", () => {
    expect(stateTilesUrl("karnataka")).toBe(stateTilesUrl("Karnataka"));
    expect(stateTilesUrl("  KARNATAKA  ")).toBe(stateTilesUrl("Karnataka"));
  });

  it("honours a custom origin", () => {
    expect(stateTilesUrl("Karnataka", "https://cdn.example.com")).toBe(
      "https://cdn.example.com/beyond-karnataka.pmtiles",
    );
  });

  it("returns undefined for a name with no hosted tiles", () => {
    // Synthetic names (not real states) so this never breaks as states are added.
    expect(stateTilesUrl("not a state")).toBeUndefined();
    expect(stateTilesUrl("Xanadu")).toBeUndefined();
  });

  it("every HOSTED_STATE_TILES entry points at a beyond-*.pmtiles object", () => {
    for (const file of Object.values(HOSTED_STATE_TILES)) {
      expect(file).toMatch(/^beyond-[a-z0-9-]+\.pmtiles$/);
    }
  });
});

describe("vectorBasemapStyle with a per-state pmtiles URL", () => {
  it("points the vector source at the given state's tiles", () => {
    const url = stateTilesUrl("Karnataka")!;
    const style = vectorBasemapStyle({ pmtilesUrl: url }) as {
      sources: Record<string, { url: string }>;
    };
    expect(style.sources.osm.url).toBe(`pmtiles://${url}`);
  });
});
