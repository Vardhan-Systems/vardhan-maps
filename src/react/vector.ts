// ─────────────────────────────────────────────────────────────────────────────
// Self-hosted OpenStreetMap VECTOR basemap for the Leaflet renderer.
//
// Instead of pulling rendered raster tiles from a third party (Esri, CARTO,
// Google…), you host ONE `.pmtiles` file built from *current* OpenStreetMap data
// (with the OpenMapTiles schema — e.g. via Planetiler or tilemaker) plus the
// label glyph fonts, and render them with MapLibre GL under the Leaflet
// boundaries/markers. You own the whole stack and control exactly what shows.
//
// This helper builds a clean, **light-grey minimal** basemap: land, water,
// roads (width by class), and city/town/village + road-name labels — and
// deliberately NO point-of-interest layer at all (no hospital/shop/fuel icons).
//
// Schema: OpenMapTiles (source-layers `water`, `waterway`, `landcover`,
// `landuse`, `transportation`, `transportation_name`, `place`, …). The single
// vector source is named `osm`. Labels read `name:latin` → `name:en` → `name`.
// ─────────────────────────────────────────────────────────────────────────────

/** A MapLibre GL style object (kept loose so we don't depend on maplibre types). */
export type VectorStyle = Record<string, unknown>;

/** The light-grey palette. Every colour is overridable via `colors`. */
export interface GreyPalette {
  /** Land / paper background. */
  background: string;
  /** Water fill (seas, lakes, wide rivers). */
  water: string;
  /** Thin waterway lines (streams/canals). */
  waterway: string;
  /** Faint green for parks / wood. */
  green: string;
  /** Casing (outline) under major roads. */
  roadCasing: string;
  /** Fill of major roads (motorway/trunk/primary). */
  roadMajor: string;
  /** Fill of secondary/tertiary roads. */
  roadSecondary: string;
  /** Fill of minor/residential/service roads. */
  roadMinor: string;
  /** Railway lines. */
  rail: string;
  /** Place-label text (cities/towns/villages). */
  placeText: string;
  /** Road-label text. */
  roadText: string;
  /** Halo behind all label text. */
  textHalo: string;
}

/** Clean light-grey canvas (Esri-Light-Gray-like): grey land, white roads. */
const DEFAULT_PALETTE: GreyPalette = {
  background: "#e8e8e6",
  water: "#c7d2d8",
  waterway: "#b9c6cd",
  green: "#dfe3da",
  roadCasing: "#d0d0cd",
  roadMajor: "#ffffff",
  roadSecondary: "#fafafa",
  roadMinor: "#f2f2f0",
  rail: "#c4c4c1",
  placeText: "#3d4043",
  roadText: "#7c7f83",
  textHalo: "#ffffff",
};

export interface VectorBasemapOptions {
  /**
   * URL of your hosted `.pmtiles` file (served with HTTP range support + CORS,
   * e.g. from Cloudflare R2). Do NOT prefix with `pmtiles://` — that's added for you.
   */
  pmtilesUrl: string;
  /**
   * URL template for the label glyph fonts, with `{fontstack}` and `{range}`
   * placeholders, e.g. `https://cdn.example.com/fonts/{fontstack}/{range}.pbf`.
   * Host the `NotoSans-Regular` stack (the only stack this style references).
   */
  glyphsUrl: string;
  /** Attribution HTML. Defaults to the required OpenStreetMap credit. */
  attribution?: string;
  /** Override any palette colours (e.g. `{ water: "#c3d3d9" }`). */
  colors?: Partial<GreyPalette>;
  /**
   * Preferred label language field to try first. Default "latin" → `name:latin`
   * (transliterated Latin script). Pass "en" for `name:en`, or "local" to use the
   * raw local `name` only.
   */
  lang?: "latin" | "en" | "local";
  /** Font stack name to request from `glyphsUrl`. Default "NotoSans-Regular". */
  fontStack?: string;
}

const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

const SRC = "osm"; // our single vector source id

/** Build the `text-field` expression: preferred lang → English → local name. */
function labelField(lang: "latin" | "en" | "local"): unknown {
  if (lang === "local") return ["coalesce", ["get", "name"], ""];
  const first = lang === "en" ? "name:en" : "name:latin";
  return ["coalesce", ["get", first], ["get", "name:en"], ["get", "name"], ""];
}

/**
 * Build a MapLibre GL style for a self-hosted OpenStreetMap vector basemap —
 * light-grey, with city/town/village + road-name labels and no POI icons.
 * Pass the result straight to `<IndiaMap mode="leaflet" vectorStyle={…} />`.
 *
 * Pure/synchronous — no runtime dependencies, so it (and the map) stay light.
 */
export function vectorBasemapStyle(options: VectorBasemapOptions): VectorStyle {
  const {
    pmtilesUrl,
    glyphsUrl,
    attribution = OSM_ATTR,
    colors,
    lang = "latin",
    fontStack = "NotoSans-Regular",
  } = options;
  const c: GreyPalette = { ...DEFAULT_PALETTE, ...(colors ?? {}) };
  const fonts = [fontStack];
  const text = labelField(lang);

  // Road width ramps (px) by zoom, per road group. MapLibre interpolate exprs.
  const width = (z: [number, number][]): unknown => [
    "interpolate", ["linear"], ["zoom"], ...z.flat(),
  ];

  const layers: Record<string, unknown>[] = [
    // ── Background (land / paper) ──────────────────────────────────────────────
    { id: "background", type: "background", paint: { "background-color": c.background } },

    // ── Water & greenery ───────────────────────────────────────────────────────
    {
      id: "water", type: "fill", source: SRC, "source-layer": "water",
      filter: ["!=", ["get", "intermittent"], 1],
      paint: { "fill-color": c.water },
    },
    {
      id: "green", type: "fill", source: SRC, "source-layer": "landcover",
      filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "park", "forest", "scrub"]]],
      paint: { "fill-color": c.green, "fill-opacity": 0.6 },
    },
    {
      id: "waterway", type: "line", source: SRC, "source-layer": "waterway",
      minzoom: 9,
      paint: { "line-color": c.waterway, "line-width": width([[9, 0.5], [16, 2]]) },
    },

    // ── Roads: casing first, then fill (so casings sit under all fills) ─────────
    {
      id: "road-casing-major", type: "line", source: SRC, "source-layer": "transportation",
      minzoom: 6,
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": c.roadCasing, "line-width": width([[6, 1.2], [12, 5], [16, 14]]) },
    },
    {
      id: "road-minor", type: "line", source: SRC, "source-layer": "transportation",
      minzoom: 12,
      filter: ["in", ["get", "class"], ["literal", ["minor", "service", "track"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": c.roadMinor, "line-width": width([[12, 0.6], [16, 4], [18, 10]]) },
    },
    {
      id: "road-secondary", type: "line", source: SRC, "source-layer": "transportation",
      minzoom: 9,
      filter: ["in", ["get", "class"], ["literal", ["secondary", "tertiary"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": c.roadSecondary, "line-width": width([[9, 0.8], [13, 3], [17, 11]]) },
    },
    {
      id: "road-major", type: "line", source: SRC, "source-layer": "transportation",
      minzoom: 6,
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": c.roadMajor, "line-width": width([[6, 0.6], [12, 3.5], [16, 11]]) },
    },
    {
      id: "rail", type: "line", source: SRC, "source-layer": "transportation",
      minzoom: 11,
      filter: ["==", ["get", "class"], "rail"],
      paint: { "line-color": c.rail, "line-width": width([[11, 0.5], [16, 2]]) },
    },

    // ── Road-name labels (follow the line) ─────────────────────────────────────
    {
      id: "road-name", type: "symbol", source: SRC, "source-layer": "transportation_name",
      minzoom: 13,
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary", "minor"]]],
      layout: {
        "symbol-placement": "line", "text-field": text, "text-font": fonts,
        "text-size": width([[13, 10], [18, 13]]), "text-max-angle": 30,
      },
      paint: { "text-color": c.roadText, "text-halo-color": c.textHalo, "text-halo-width": 1.4 },
    },

    // ── Place labels: villages/suburbs, towns, then cities (drawn last = on top) ─
    {
      id: "place-village", type: "symbol", source: SRC, "source-layer": "place",
      minzoom: 11,
      filter: ["in", ["get", "class"], ["literal", ["village", "hamlet", "suburb", "neighbourhood", "quarter"]]],
      layout: {
        "text-field": text, "text-font": fonts, "text-size": width([[11, 10], [16, 14]]),
        "text-max-width": 8, "text-padding": 2,
      },
      paint: { "text-color": c.placeText, "text-halo-color": c.textHalo, "text-halo-width": 1.4, "text-opacity": 0.85 },
    },
    {
      id: "place-town", type: "symbol", source: SRC, "source-layer": "place",
      minzoom: 8,
      filter: ["==", ["get", "class"], "town"],
      layout: {
        "text-field": text, "text-font": fonts, "text-size": width([[8, 11], [14, 16]]),
        "text-max-width": 8, "text-padding": 2,
      },
      paint: { "text-color": c.placeText, "text-halo-color": c.textHalo, "text-halo-width": 1.6 },
    },
    {
      id: "place-city", type: "symbol", source: SRC, "source-layer": "place",
      minzoom: 5,
      filter: ["in", ["get", "class"], ["literal", ["city", "state_capital"]]],
      layout: {
        "text-field": text, "text-font": fonts, "text-size": width([[5, 12], [12, 20]]),
        "text-max-width": 8, "text-padding": 2,
      },
      paint: { "text-color": c.placeText, "text-halo-color": c.textHalo, "text-halo-width": 1.8 },
    },
  ];

  return {
    version: 8,
    glyphs: glyphsUrl,
    sources: {
      [SRC]: { type: "vector", url: `pmtiles://${pmtilesUrl}`, attribution },
    },
    layers,
  };
}
