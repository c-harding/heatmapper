<script setup lang="ts">
import type { Activity } from '@strava-heatmapper/shared/interfaces';
import { ref } from 'vue';

import MapView from './components/MapView.vue';
import Sidebar from './components/Sidebar.vue';
import { MapStyle } from './MapStyle';

const map = ref<typeof MapView>();

const location = ref({ lat: 51.45, lng: -2.6 });

const zoom = ref(10);

const activities = ref<Activity[]>([]);

const selected = ref<number[]>([]);

const terrain = ref(false);

const mapStyle = ref(MapStyle.STRAVA);

function clearActivities(): void {
  activities.value = [];
}
function addActivities(newActivities: Activity[]): void {
  const newIDs = new Set(newActivities.map((activity) => activity.id));
  activities.value = activities.value
    .filter((activity) => !newIDs.has(activity.id))
    .concat(newActivities)
    .sort((a, b) => b.date - a.date);
}

function addActivityMaps(maps: Record<string, string>): void {
  Object.entries(maps).forEach(([activity, map]) => {
    const i = activities.value.findIndex(({ id }) => id.toString() === activity);
    activities.value[i].map = map;
  });
  // Trigger the activities array watcher, so the new maps are correctly shown
  activities.value = activities.value.slice();
}

function zoomToSelected(selection: number[]): void {
  selected.value = selection;
  map.value?.zoomToSelection();
}

defineExpose({ activities });
</script>

<template>
  <div id="app">
    <Sidebar
      v-model:map-style="mapStyle"
      v-model:selected="selected"
      v-model:terrain="terrain"
      :activities="activities"
      @zoom-to-selected="zoomToSelected"
      @clear-activities="clearActivities"
      @add-activities="addActivities"
      @add-activity-maps="addActivityMaps"
    />
    <MapView
      ref="map"
      v-model:map-style="mapStyle"
      v-model:center="location"
      v-model:zoom="zoom"
      v-model:selected="selected"
      :terrain="terrain"
      :activities="activities"
    />
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
  color: #2c3e50;
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
</style>
