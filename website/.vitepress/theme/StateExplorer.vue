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
        <template v-else-if="selected">
          <strong>{{ current }} › {{ selected }}</strong> — zoomed in over the
          district's roads. <strong>Scroll / use +</strong> to see every street;
          click another district, or <strong>← Back to India</strong>.
        </template>
        <template v-else>
          <strong>{{ current }}</strong> — self-hosted vector basemap (roads + water
          + labels). <strong>Click a district</strong> (or scroll to zoom), then see
          all its roads. Or go back.
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
const selected = ref(""); // selected district name
const loading = ref(false);

let L: any,
  map: any,
  statesLayer: any = null,
  glLayer: any = null,
  districtsLayer: any = null,
  selectedDistrict: any = null;

// A fully transparent fill keeps the basemap visible but makes the WHOLE district
// clickable — an unfilled path only responds on its 1px boundary line.
const DISTRICT_STYLE = {
  color: "#334155",
  weight: 1,
  opacity: 0.75,
  fill: true,
  fillColor: "#2563eb",
  fillOpacity: 0,
};
const DISTRICT_SELECTED = {
  color: "#2563eb",
  weight: 3,
  fill: true,
  fillColor: "#2563eb",
  fillOpacity: 0.12,
};
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
    selected.value = "";
    selectedDistrict = null;
    loading.value = true;

    if (statesLayer) {
      map.removeLayer(statesLayer);
      statesLayer = null;
    }
    map.fitBounds(bounds, { padding: [20, 20] });
    // Once you've committed to a state, let the wheel zoom in to see every road.
    map.scrollWheelZoom.enable();

    // The state's own self-hosted vector basemap (roads + water + labels).
    const url = stateTilesUrl(name);
    if (url) {
      const style = vectorBasemapStyle({ pmtilesUrl: url });
      glLayer = (L as any).maplibreGL({ style }).addTo(map);
    }

    // District boundaries on top (lines only, hover for the name).
    const dc = await loadDistricts(name);
    districtsLayer = L.geoJSON(dc, {
      style: () => ({ ...DISTRICT_STYLE }),
      onEachFeature: (f: any, dl: any) => {
        const dname = f.properties.name;
        dl.bindTooltip(dname, { sticky: true });
        dl.on("mouseover", () => {
          if (dl !== selectedDistrict) dl.setStyle({ weight: 2, color: "#2563eb", fillOpacity: 0.06 });
        });
        dl.on("mouseout", () => {
          if (dl !== selectedDistrict) dl.setStyle(DISTRICT_STYLE);
        });
        dl.on("click", (e: any) => {
          L.DomEvent.stop(e);
          selectDistrict(dl, dname);
        });
      },
    }).addTo(map);
    loading.value = false;
  } catch (e: any) {
    error.value = "Could not load " + name + ": " + (e?.message ?? e);
    loading.value = false;
  }
}

function selectDistrict(dl: any, name: string) {
  if (selectedDistrict && selectedDistrict !== dl) selectedDistrict.setStyle(DISTRICT_STYLE);
  selectedDistrict = dl;
  dl.setStyle(DISTRICT_SELECTED);
  dl.bringToFront();
  // Zoom deep enough that the full street network renders (minor roads appear at
  // z12+, road-name labels at z13+). Small districts reach street level; larger
  // ones fit lower — scroll/zoom in to see every road.
  map.fitBounds(dl.getBounds(), { padding: [20, 20], maxZoom: 13 });
  selected.value = name;
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
  selectedDistrict = null;
  selected.value = "";
  mode.value = "india";
  current.value = "";
  map.scrollWheelZoom.disable();
  drawStates();
  map.setView(INDIA_CENTER, INDIA_ZOOM);
}

onBeforeUnmount(() => {
  if (map) map.remove();
});
</script>
