<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import MapView from './components/map/MapView.vue';
import CollapsibleSidebar from './components/sidebar/CollapsibleSidebar.vue';
import SidebarContent from './components/sidebar/SidebarContent.vue';
import { provideActivityService } from './services/useActivityService';

const { routes = false } = defineProps<{ routes: boolean }>();

const router = useRouter();

const useRoutes = computed<boolean>({
  get() {
    return routes;
  },
  set(value) {
    return value ? router.replace({ path: '/routes' }) : router.push({ path: '/' });
  },
});

const map = ref<typeof MapView>();

const geolocation = ref({ lat: 51.45, lng: -2.6 });

const zoom = ref(10);

const { mapItems } = provideActivityService({ useRoutes });

const selected = ref<readonly string[]>([]);

const minimised = ref(false);

function zoomToSelected(): void {
  map.value?.zoomToSelection();
}

function scrollToSelected() {
  const el = document.querySelector('.selected');
  el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

defineExpose({ mapItems });
</script>

<template>
  <div id="app">
    <CollapsibleSidebar v-model:minimised="minimised" @scroll-down="scrollToSelected()">
      <SidebarContent
        v-model:selected="selected"
        @focus-sidebar="minimised = false"
        @zoom-to-selected="zoomToSelected"
        @scroll-to-selected="scrollToSelected"
      />
    </CollapsibleSidebar>
    <Suspense>
      <MapView
        ref="map"
        v-model:center="geolocation"
        v-model:zoom="zoom"
        v-model:selected="selected"
        :mapItems
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

a[href] {
  color: var(--link-color);
}

:root {
  --color-full: #222;
  --color-strong: #333;
  --color-mid: #5a5a5a;
  --color-weak: #808080;
  --background-weak: #ccc;
  --background-mid: #ddd;
  --background-strong: #eee;
  --background-full: #fff;
  --background-pure: #fff;
  --background-error: hsl(0 90% 90%);
  --transition-speed: 0.5s;
  --bold-color: #fc4c02;
  --link-color: blue;
  --border-radius: 7px;
  font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  background-color: var(--background-full);
  color: var(--color-full);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-full: #fff;
    --color-strong: #eee;
    --color-mid: #b7b7b7;
    --color-weak: #808080;
    --background-weak: #555;
    --background-mid: #444;
    --background-strong: #333;
    --background-full: #222;
    --background-pure: #000;
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
