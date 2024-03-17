<script setup lang="ts">
import { ref } from 'vue';

import MapView from './components/map/MapView.vue';
import CollapsibleSidebar from './components/sidebar/CollapsibleSidebar.vue';
import SidebarContent from './components/sidebar/SidebarContent.vue';
import { useActivityService } from './services/useActivityService';

const map = ref<typeof MapView>();

const location = ref({ lat: 51.45, lng: -2.6 });

const zoom = ref(10);

const { mapItems } = useActivityService();

const selected = ref<string[]>([]);

const minimised = ref(false);

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

  isolation: isolate;
}

a {
  color: var(--link-color);
}

:root {
  --color: #222;
  --color-slight: #333;
  --color-weak: #808080;
  --background: #fff;
  --background-pure: #fff;
  --background-slight: #eee;
  --background-strong: #ccc;
  --background-error: hsl(0 90% 90%);
  --transition-speed: 0.5s;
  --bold-color: #fc4c02;
  --link-color: blue;
  font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  background-color: var(--background);
  color: var(--color);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color: #fff;
    --color-slight: #eee;
    --color-weak: #808080;
    --background: #222;
    --background-pure: #000;
    --background-slight: #333;
    --background-strong: #555;
    --background-error: hsl(0 90% 30%);
    --bold-color: #fc4c02;
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
