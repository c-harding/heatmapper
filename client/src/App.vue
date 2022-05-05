<template>
  <div id="app">
    <Sidebar
      v-model:selected="selected"
      :activities="activities"
      @zoom-to-selected="zoomToSelected"
      @clear-activities="clearActivities"
      @add-activities="addActivities"
      @add-activity-maps="addActivityMaps"
    />
    <MapView
      ref="map"
      v-model:center="location"
      v-model:zoom="zoom"
      v-model:selected="selected"
      :activities="activities"
    />
  </div>
</template>

<script setup lang="ts">
import type { Activity } from '@strava-heatmapper/shared/interfaces';
import { defineAsyncComponent } from 'vue';
import { $ref } from 'vue/macros';

import MapView from './components/MapView.vue';

const Sidebar = defineAsyncComponent(() => import('./components/Sidebar.vue'));

let map = $ref<typeof MapView>();

let location = $ref({ lat: 51.45, lng: -2.6 });

let zoom = $ref(10);

let activities: Activity[] = $ref([]);

let selected: number[] = $ref([]);

function clearActivities(): void {
  activities = [];
}
function addActivities(newActivities: Activity[]): void {
  const newIDs = new Set(newActivities.map((activity) => activity.id));
  activities = activities
    .filter((activity) => !newIDs.has(activity.id))
    .concat(newActivities)
    .sort((a, b) => b.date - a.date);
}

function addActivityMaps(maps: Record<string, string>): void {
  Object.entries(maps).forEach(([activity, map]) => {
    const i = activities.findIndex(({ id }) => id.toString() === activity);
    activities[i].map = map;
  });
}

function zoomToSelected(selection: number[]): void {
  selected = selection;
  map.zoomToSelection();
}
</script>

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
