<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import MapView from './components/map/MapView.vue';
import SelectionCard from './components/map/SelectionCard.vue';
import CollapsibleSidebar from './components/sidebar/CollapsibleSidebar.vue';
import SidebarContent from './components/sidebar/SidebarContent.vue';
import { SELECTED_SIDEBAR_ITEM_SELECTOR } from './components/sidebar/SidebarItem.vue';
import { useActivityStore } from './stores/ActivityStore';
import { useSelectionStore } from './stores/SelectionStore';

const { routes: routesInUrl = false } = defineProps<{ routes: boolean }>();

const router = useRouter();

const map = ref<typeof MapView>();

const activityStore = useActivityStore();

const selectionStore = useSelectionStore();

watch(
  [() => routesInUrl],
  ([routesInUrl]) => {
    if (activityStore.useRoutes !== routesInUrl) activityStore.useRoutes = routesInUrl;
  },
  { immediate: true },
);
watch([() => activityStore.useRoutes], ([useRoutes]) => {
  if (!useRoutes && routesInUrl) {
    router.push({ path: '/' });
  } else if (useRoutes && !routesInUrl) {
    router.replace({ path: '/routes' });
  }
});

const center = ref({ lat: 51.5, lng: -0.1 });

const zoom = ref(8);

const minimised = ref(false);

const showSelectionCard = computed(
  () => minimised.value && selectionStore.selectedItems.length > 0,
);

function zoomToSelected(): void {
  map.value?.zoomToSelection();
}

function unfold() {
  minimised.value = false;
  // Mid-slide the row is half on screen, but it should be in place before the sidebar arrives
  scrollToSelected('instant');
}

// A scroll nobody can see is only a delay, and opening the sidebar during it catches the tail, so
// animate it only while some of the row is on screen. `minimised` cannot answer that: it flips
// when the slide starts, not when it ends.
function scrollToSelected(behavior?: ScrollBehavior) {
  const el = document.querySelector(`.${SELECTED_SIDEBAR_ITEM_SELECTOR}`);
  if (!el) return;
  const { left, right } = el.getBoundingClientRect();
  const showing = Math.min(right, window.innerWidth) - Math.max(left, 0);
  el.scrollIntoView({
    block: 'nearest',
    behavior: behavior ?? (showing > 0 ? 'smooth' : 'instant'),
  });
}

defineExpose({ mapItems: activityStore.mapItems });
</script>

<template>
  <div id="app">
    <CollapsibleSidebar v-model:minimised="minimised" @scroll-down="scrollToSelected()">
      <SidebarContent @zoom-to-selected="zoomToSelected" @scroll-to-selected="scrollToSelected" />
    </CollapsibleSidebar>
    <Suspense>
      <MapView
        ref="map"
        v-model:center="center"
        v-model:zoom="zoom"
        :minimisedSidebar="minimised"
        :cardShown="showSelectionCard"
      >
        <template #bottom>
          <SelectionCard @unfold="unfold()" />
        </template>
      </MapView>
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
  --transition-ease: ease-in-out;
  --bold-color: #fc4c02;
  --link-color: blue;
  --control-border-radius: 7px;
  --surface-border-radius: 1rem;
  --font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
  font-family: var(--font-family);
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
    color-scheme: dark;
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
