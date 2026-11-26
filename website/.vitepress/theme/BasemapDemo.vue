<template>
  <ClientOnly>
    <div class="map-demo">
      <div ref="el" class="map-demo__canvas" />
      <p v-if="error" class="map-demo__err">{{ error }}</p>
      <p class="map-demo__cap">
        Live — Karnataka's self-hosted OpenStreetMap <strong>vector basemap</strong>
        (roads + labels, no POI), rendered with MapLibre GL under Leaflet. Pan &amp; zoom.
      </p>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = withDefaults(defineProps<{ state?: string; center?: [number, number]; zoom?: number }>(), {
  state: "Karnataka",
  center: () => [15.3, 76.1],
  zoom: 7,
});

const el = ref<HTMLElement | null>(null);
const error = ref("");
let map: any = null;

onMounted(async () => {
  try {
    const L: any = (await import("leaflet")).default;
    await import("leaflet/dist/leaflet.css");
    const maplibregl: any = (await import("maplibre-gl")).default;
    await import("maplibre-gl/dist/maplibre-gl.css");
    await import("@maplibre/maplibre-gl-leaflet");
    const pm: any = await import("pmtiles");
    const { vectorBasemapStyle, stateTilesUrl } = await import("vardhan-maps/react");

    if (!(window as any).__pmtilesRegistered) {
      maplibregl.addProtocol("pmtiles", new pm.Protocol().tile);
      (window as any).__pmtilesRegistered = true;
    }

    map = L.map(el.value, { scrollWheelZoom: false }).setView(props.center, props.zoom);
    const style = vectorBasemapStyle({ pmtilesUrl: stateTilesUrl(props.state) });
    (L as any).maplibreGL({ style }).addTo(map);
    L.control.scale().addTo(map);
  } catch (e: any) {
    error.value = "Basemap failed to load: " + (e?.message ?? e);
  }
});

onBeforeUnmount(() => {
  if (map) map.remove();
});
</script>
