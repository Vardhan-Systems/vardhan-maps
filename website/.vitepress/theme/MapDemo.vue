<template>
  <ClientOnly>
    <div class="map-demo">
      <div ref="el" class="map-demo__canvas" />
      <p v-if="error" class="map-demo__err">{{ error }}</p>
      <p class="map-demo__cap">
        Live — India state boundaries from <code>vardhan-maps/data</code> (GeoJSON).
        Hover a state; pan &amp; zoom.
      </p>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const el = ref<HTMLElement | null>(null);
const error = ref("");
let map: any = null;

// Cohesive cool ramp (same spirit as the README hero), deterministic per name.
const ramp = ["#1e3a8a", "#1d4ed8", "#2563eb", "#0ea5e9", "#06b6d4", "#14b8a6", "#10b981"];
const hash = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};
const colorFor = (name: string) => ramp[hash(name) % ramp.length];

onMounted(async () => {
  try {
    const L: any = (await import("leaflet")).default;
    await import("leaflet/dist/leaflet.css");
    const { states } = await import("vardhan-maps/data");

    map = L.map(el.value, { scrollWheelZoom: false }).setView([22.5, 80], 4);
    const layer = L.geoJSON(states as any, {
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
      },
    }).addTo(map);
    map.fitBounds(layer.getBounds(), { padding: [10, 10] });
  } catch (e: any) {
    error.value = "Map failed to load: " + (e?.message ?? e);
  }
});

onBeforeUnmount(() => {
  if (map) map.remove();
});
</script>
