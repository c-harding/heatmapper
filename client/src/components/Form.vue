<script setup lang="ts">
import type { FindingStats } from '@strava-heatmapper/shared/interfaces';
import { computed, ref } from 'vue';

import { useActivityService } from '@/services/useActivityService';
import { capitalise, count, countActivities, nonEmpties } from '@/utils/strings';

import { sportGroups, sportTypes } from '../sportTypes';
import DateInput from './DateInput.vue';
import Dropdown from './Dropdown.vue';
import Login from './Login.vue';

const start = ref<Date>();
const end = ref<Date>();

const {
  error,
  clientStats,
  stats,
  sportType,
  gear,
  clearMapItems,
  loadPartial,
  loadRoutes,
  continueLogin,
} = useActivityService();

function findingString(stats?: FindingStats, inCache?: boolean): string;
function findingString(
  { started = false, finished = false, length = 0 }: Partial<FindingStats> = {},
  inCache = false,
) {
  // TODO: generic for activities/routes
  if (finished && inCache) return `found ${countActivities(length)} in cache`;
  if (finished) return `found ${countActivities(length)}`;
  if (length) return `found ${countActivities(length)} so far`;
  if (started) return 'finding activities';
  return '';
}

function mapString(requested = 0, length = 0, uncached = 0) {
  if (uncached && requested === 0) return 'but no maps cached';
  if (uncached) return `loaded ${length} maps, ${uncached} maps not cached`;
  if (requested && requested === length) return 'loaded all maps';
  if (length) return `loaded ${length} of ${count(requested, 'map')} so far`;
  if (requested) return `requested ${count(requested, 'map')}`;
  return '';
}

const sortedSportTypes = [...Object.entries(sportGroups), ...Object.entries(sportTypes)]
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

const statusMessage = computed(() => {
  return error.value || statsMessage();
});

function statsMessage(): string {
  if (stats.value.cleared) return 'Cleared cache';
  return capitalise(
    nonEmpties(
      findingString(stats.value.finding, clientStats.value.inCache),
      mapString(
        clientStats.value.mapsRequested,
        clientStats.value.mapsLoaded,
        clientStats.value.mapsNotCached,
      ),
    ).join(', '),
  );
}

function clearCache(): void {
  localStorage.clear();
  document.cookie = `token=;expires=${new Date(0).toUTCString()}`;
  stats.value = { cleared: true };
  clearMapItems();
}

defineExpose({ gear });
</script>

<template>
  <aside>
    <div class="controls">
      <label>
        <span>Start date</span>
        <DateInput v-model="start" name="start" />
      </label>
      <label>
        <span>End date</span>
        <DateInput v-model="end" name="end" />
      </label>
    </div>
    <div class="buttons">
      <button @click="loadPartial(start, end)">Load</button>
      <button @click="loadRoutes(start, end)">Routes</button>
      <button @click="clearCache">Clear cache</button>
    </div>
    <Login v-if="continueLogin" @login="continueLogin($event)" />
    <p v-else :class="{ error }" v-text="statusMessage" />
    <div class="controls">
      <label>
        <span>Sport type</span>
        <Dropdown
          v-model="sportType"
          :options="sortedSportTypes"
          blank-value=""
          blank-label="All sports"
        />
      </label>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.controls {
  padding: 1em;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;

  label {
    display: flex;
    align-items: center;
    min-width: 0;
  }
}

aside > .buttons {
  margin: 5px auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
}

.error {
  color: red;
}
</style>
