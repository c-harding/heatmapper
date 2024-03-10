<script setup lang="ts">
import type { MapItem } from '@strava-heatmapper/shared/interfaces';
import { ref } from 'vue';

import CollapsibleSidebar from './components/CollapsibleSidebar.vue';
import MapView from './components/MapView.vue';
import SidebarContent from './components/SidebarContent.vue';

const map = ref<typeof MapView>();

const location = ref({ lat: 51.45, lng: -2.6 });

const zoom = ref(10);

const mapItems = ref<MapItem[]>([]);

const selected = ref<string[]>([]);

const minimised = ref(false);

function clearMapItems(): void {
  mapItems.value = [];
}
function addMapItems(newItems: MapItem[]): void {
  const newIDs = new Set(newItems.map((item) => item.id));
  mapItems.value = mapItems.value
    .filter((item) => !newIDs.has(item.id))
    .concat(newItems)
    .sort((a, b) => b.date - a.date);
}

function addMaps(maps: Record<string, string>): void {
  Object.entries(maps).forEach(([item, map]) => {
    const i = mapItems.value.findIndex(({ id }) => id.toString() === item);
    mapItems.value[i].map = map;
  });

  // Trigger change detection for mapItems
  mapItems.value = mapItems.value.slice();
}

function zoomToSelected(): void {
  map.value?.zoomToSelection();
}

defineExpose({ mapItems });
</script>

<template>
  <div id="app">
    <CollapsibleSidebar v-model:minimised="minimised">
      <SidebarContent
        v-model:selected="selected"
        :map-items="mapItems"
        @focus-sidebar="minimised = false"
        @zoom-to-selected="zoomToSelected"
        @clear-map-items="clearMapItems"
        @add-map-items="addMapItems"
        @add-maps="addMaps"
      />
    </CollapsibleSidebar>
    <Suspense>
      <MapView
        ref="map"
        v-model:center="location"
        v-model:zoom="zoom"
        v-model:selected="selected"
        :map-items="mapItems"
      />
    </Suspense>
  </div>
</template>

<style>
html,
body {
  height: 100%;
  overflow: hidden;
  margin: 0;
}
#app {
  height: 100%;
  display: flex;
  align-items: stretch;
  flex-direction: row;
  font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--color);
}

a {
  color: var(--link-color);
}

:root {
  --color: #222;
  --background: #fff;
  --background-slight: #eee;
  --background-strong: #ccc;
  --transition-speed: 0.5s;
  --link-color: blue;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color: #fff;
    --background: #222;
    --background-slight: #333;
    --background-strong: #555;
    --link-color: lightblue;
  }
}

#app {
  --inline-start-safe-area: env(safe-area-inset-left);
  --inline-end-safe-area: env(safe-area-inset-right);
  --top-safe-area: env(safe-area-inset-top);
  --bottom-safe-area: env(safe-area-inset-bottom);

  &:dir(rtl) {
    --inline-start-safe-area: env(safe-area-inset-right);
    --inline-end-safe-area: env(safe-area-inset-left);
  }
}
</style>
