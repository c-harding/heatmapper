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

// The card already names the selection, so unfolding over it would only repeat itself
function focusSidebar(): void {
  if (!showSelectionCard.value) minimised.value = false;
}

// Only a fold hands the space over, so only then does the card wait; a selection made on the map
// has nothing in its way. True from the fold until the card it let in has gone again.
const sidebarClearing = ref(false);

watch(minimised, () => {
  sidebarClearing.value = showSelectionCard.value;
});

watch(showSelectionCard, (shown) => {
  if (!shown) sidebarClearing.value = false;
});

function unfold() {
  minimised.value = false;
  scrollToSelected();
}

function scrollToSelected() {
  const el = document.querySelector(`.${SELECTED_SIDEBAR_ITEM_SELECTOR}`);
  el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

defineExpose({ mapItems: activityStore.mapItems });
</script>

<template>
  <div id="app">
    <CollapsibleSidebar v-model:minimised="minimised" @scroll-down="scrollToSelected()">
      <SidebarContent
        @focus-sidebar="focusSidebar()"
        @zoom-to-selected="zoomToSelected"
        @scroll-to-selected="scrollToSelected"
      />
    </CollapsibleSidebar>
    <Suspense>
      <MapView
        ref="map"
        v-model:center="center"
        v-model:zoom="zoom"
        :minimisedSidebar="minimised"
        :sidebarClearing
      >
        <template #bottom>
          <Transition name="map-footer">
            <SelectionCard
              v-if="showSelectionCard"
              @unfold="unfold()"
            />
          </Transition>
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
