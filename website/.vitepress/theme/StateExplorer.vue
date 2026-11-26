<template>
  <ClientOnly>
    <div class="map-demo">
      <div class="map-demo__wrap">
        <div ref="el" class="map-demo__canvas" />
        <button v-if="mode === 'state'" class="map-demo__back" @click="backToIndia">
          ← Back to India
        </button>
        <div v-if="loading" class="map-demo__loading">Loading {{ current }}…</div>
      </div>
      <p v-if="error" class="map-demo__err">{{ error }}</p>
      <p class="map-demo__cap">
        <template v-if="mode === 'india'">
          Live — <strong>click any state or UT</strong> to drill in and see its roads,
          water &amp; labels (the self-hosted vector basemap) with district boundaries.
        </template>
        <template v-else>
          <strong>{{ current }}</strong> — self-hosted OpenStreetMap vector basemap
          (roads + water + labels) with district boundaries. Pan &amp; zoom, or go back.
        </template>
      </p>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const el = ref<HTMLElement | null>(null);
const error = ref("");
const mode = ref<"india" | "state">("india");
const current = ref("");
const loading = ref(false);

let L: any,
  map: any,
  statesLayer: any = null,
  glLayer: any = null,
  districtsLayer: any = null;
let statesData: any,
  vectorBasemapStyle: any,
  stateTilesUrl: any,
  loadDistricts: any;

const INDIA_CENTER: [number, number] = [22.5, 80];
const INDIA_ZOOM = 4;

const ramp = ["#1e3a8a", "#1d4ed8", "#2563eb", "#0ea5e9", "#06b6d4", "#14b8a6", "#10b981"];
const hash = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};
const colorFor = (n: string) => ramp[hash(n) % ramp.length];

onMounted(async () => {
  try {
    L = (await import("leaflet")).default;
    await import("leaflet/dist/leaflet.css");
    const maplibregl: any = (await import("maplibre-gl")).default;
    await import("maplibre-gl/dist/maplibre-gl.css");
    await import("@maplibre/maplibre-gl-leaflet");
    const pm: any = await import("pmtiles");
    const vm: any = await import("vardhan-maps/react");
    vectorBasemapStyle = vm.vectorBasemapStyle;
    stateTilesUrl = vm.stateTilesUrl;
    const data: any = await import("vardhan-maps/data");
    statesData = data.states;
    loadDistricts = data.loadDistricts;

    if (!(window as any).__pmReg) {
      maplibregl.addProtocol("pmtiles", new pm.Protocol().tile);
      (window as any).__pmReg = true;
    }

    map = L.map(el.value, { scrollWheelZoom: false }).setView(INDIA_CENTER, INDIA_ZOOM);
    drawStates();
  } catch (e: any) {
    error.value = "Map failed to load: " + (e?.message ?? e);
  }
});

function drawStates() {
  statesLayer = L.geoJSON(statesData, {
    style: (f: any) => ({
      fillColor: colorFor(f.properties.name),
      color: "#ffffff",
      weight: 1,
      fillOpacity: 0.85,
    }),
    onEachFeature: (f: any, lyr: any) => {
      lyr.bindTooltip(f.properties.name, { sticky: true });
      lyr.on("mouseover", () => lyr.setStyle({ weight: 2.5, fillOpacity: 1 }));
      lyr.on("mouseout", () => lyr.setStyle({ weight: 1, fillOpacity: 0.85 }));
      lyr.on("click", () => drillInto(f.properties.name, lyr.getBounds()));
    },
  }).addTo(map);
  map.fitBounds(statesLayer.getBounds(), { padding: [10, 10] });
}

async function drillInto(name: string, bounds: any) {
  try {
    mode.value = "state";
    current.value = name;
    loading.value = true;

    if (statesLayer) {
      map.removeLayer(statesLayer);
      statesLayer = null;
    }
    map.fitBounds(bounds, { padding: [20, 20] });

    // The state's own self-hosted vector basemap (roads + water + labels).
    const url = stateTilesUrl(name);
    if (url) {
      const style = vectorBasemapStyle({ pmtilesUrl: url });
      glLayer = (L as any).maplibreGL({ style }).addTo(map);
    }

    // District boundaries on top (lines only, hover for the name).
    const dc = await loadDistricts(name);
    districtsLayer = L.geoJSON(dc, {
      style: () => ({ color: "#334155", weight: 1, fill: false, opacity: 0.75 }),
      onEachFeature: (f: any, dl: any) => {
        dl.bindTooltip(f.properties.name, { sticky: true });
        dl.on("mouseover", () => dl.setStyle({ weight: 2, color: "#2563eb" }));
        dl.on("mouseout", () => dl.setStyle({ weight: 1, color: "#334155" }));
      },
    }).addTo(map);
    loading.value = false;
  } catch (e: any) {
    error.value = "Could not load " + name + ": " + (e?.message ?? e);
    loading.value = false;
  }
}

function backToIndia() {
  if (glLayer) {
    map.removeLayer(glLayer);
    glLayer = null;
  }
  if (districtsLayer) {
    map.removeLayer(districtsLayer);
    districtsLayer = null;
  }
  mode.value = "india";
  current.value = "";
  drawStates();
  map.setView(INDIA_CENTER, INDIA_ZOOM);
}

onBeforeUnmount(() => {
  if (map) map.remove();
});
</script>
