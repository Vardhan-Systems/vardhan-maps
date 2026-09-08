import { describe, expect, it } from "vitest";
import {
  getState,
  getStates,
  loadAllDistricts,
  loadDistricts,
  loadStates,
  meta,
  RESOLUTIONS,
  states,
  stateSlug,
} from "../src/data";

describe("states (eager)", () => {
  it("bundles all 36 states/UTs with ISO codes", () => {
    expect(getStates()).toHaveLength(36);
    expect(states.features.every((f) => /^IN-[A-Z]{2}$/.test(f.properties.code ?? ""))).toBe(true);
  });
  it("looks up a state case-insensitively", () => {
    expect(getState("telangana")?.properties.code).toBe("IN-TG");
    expect(getState("Nowhere")).toBeUndefined();
  });
});

describe("meta", () => {
  it("declares the resolution tiers", () => {
    expect(meta.resolutions).toEqual([...RESOLUTIONS]);
    expect(meta.defaultResolution).toBe("low");
    expect(meta.goiBordersPatched).toBe(true);
    expect(meta.stateCount).toBe(36);
    expect(meta.districtCount).toBe(787);
  });
});

describe("lazy districts", () => {
  it("loads one state's districts by name or slug", async () => {
    expect(await loadDistricts("Uttar Pradesh")).toHaveLength(75);
    expect(await loadDistricts("andhra-pradesh")).toHaveLength(28);
  });
  it("high resolution keeps the count but adds detail", async () => {
    const low = await loadDistricts("Telangana", { resolution: "low" });
    const high = await loadDistricts("Telangana", { resolution: "high" });
    expect(high).toHaveLength(low.length);
    expect(JSON.stringify(high).length).toBeGreaterThan(JSON.stringify(low).length);
  });
  it("throws for an unknown state", async () => {
    await expect(loadDistricts("Atlantis")).rejects.toThrow(/no districts/);
  });
  it("loads every district at both tiers", async () => {
    expect((await loadAllDistricts()).features).toHaveLength(787);
    expect((await loadAllDistricts({ resolution: "high" })).features).toHaveLength(787);
  });
});

describe("loadStates", () => {
  it("returns eager states for low and a full set for high", async () => {
    expect((await loadStates("low")).features).toHaveLength(36);
    expect((await loadStates("high")).features).toHaveLength(36);
  });
});

describe("stateSlug", () => {
  it("resolves names and slugs", () => {
    expect(stateSlug("West Bengal")).toBe("west-bengal");
    expect(stateSlug("west-bengal")).toBe("west-bengal");
    expect(stateSlug("nope")).toBeUndefined();
  });
});
