// ─────────────────────────────────────────────────────────────────────────────
// De-duplicated boundary mesh (opt-in `crispBorders`).
//
// Drawing each polygon's own outline strokes every SHARED edge twice — once from
// each adjacent polygon — which reads as doubled / spiky borders (and the state
// outline drawn again over the district edges). A TopoJSON *mesh* collapses every
// shared arc to a single line, so each border segment is drawn exactly once.
//
// The district data ships as GeoJSON, so we build a Topology at runtime
// (`topojson-server`) and mesh it (`topojson-client`). Both are OPTIONAL peers,
// dynamically imported only when `crispBorders` is on — if they're not installed
// we return null and the caller falls back to per-polygon strokes.
// ─────────────────────────────────────────────────────────────────────────────
import type { Feature, GeoJsonObject } from "geojson";

/** Loose shapes for the two optional-peer modules (kept dependency-free at type level). */
interface TopoServer {
  topology: (objects: Record<string, unknown>, quantization?: number) => TopoTopology;
}
interface TopoClient {
  mesh: (topology: TopoTopology, object?: unknown, filter?: (a: unknown, b: unknown) => boolean) => GeoJsonObject;
}
interface TopoTopology {
  objects: Record<string, unknown>;
}

/**
 * Build a single de-duplicated border mesh (a GeoJSON MultiLineString) from a set
 * of polygon features. `interiorOnly` keeps only arcs shared by two DIFFERENT
 * features (drops the outer hull) — used when an enclosing outline is drawn
 * separately on top, so the two never overlap.
 *
 * Returns `null` if the optional `topojson-client` / `topojson-server` peers are
 * not installed (the caller then draws ordinary per-polygon outlines).
 */
export async function buildBorderMesh(
  features: Feature[],
  interiorOnly = false,
): Promise<GeoJsonObject | null> {
  if (!features.length) return null;
  try {
    const [server, client] = (await Promise.all([
      import("topojson-server" as string),
      import("topojson-client" as string),
    ])) as [TopoServer, TopoClient];
    const topology = server.topology({
      layer: { type: "FeatureCollection", features },
    });
    const object = topology.objects.layer;
    const filter = interiorOnly ? (a: unknown, b: unknown) => a !== b : undefined;
    return client.mesh(topology, object, filter);
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn(
        "[vardhan-maps] `crispBorders` needs the optional peers `topojson-client` + " +
          "`topojson-server`; drawing per-polygon borders instead.",
        err,
      );
    }
    return null;
  }
}
