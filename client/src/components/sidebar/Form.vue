<script setup lang="ts">
import { type FindingStats } from '@strava-heatmapper/shared/interfaces';
import { computed, ref } from 'vue';

import { useActivityService } from '@/services/useActivityService';
import useUser from '@/services/useUser';
import { sportGroups, sportTypes } from '@/sportTypes';
import { combineCallbacks } from '@/utils/functions';
import { capitalise, count, countActivities, nonEmpties } from '@/utils/strings';

import { TooltipError } from '../tooltip/TooltipError';
import UIButton from '../ui/UIButton.vue';
import UIDateInput from '../ui/UIDateInput.vue';
import UIDropdown from '../ui/UIDropdown.vue';
import UIModal from '../ui/UIModal.vue';
import UserLogin from './UserLogin.vue';
import UserSettings from './UserSettings.vue';

const start = ref<Date>();
const end = ref<Date>();

const {
  error,
  clientStats,
  stats,
  sportType,
  gear,
  discardCache,
  loadPartial,
  loadRoutes,
  continueLogin: continueActivityLogin,
} = useActivityService();

const { user, continueLogin: continueUserLogin, getUser } = useUser();

const continueLogin = computed(() =>
  combineCallbacks([continueUserLogin.value, continueActivityLogin.value]),
);

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

const settingsOpen = ref(false);

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

function onLogout(): void {
  document.cookie = `token=;expires=${new Date(0).toUTCString()}`;
  discardCache(true);
  settingsOpen.value = false;
}

async function settingsButton() {
  try {
    await getUser();
    settingsOpen.value = true;
  } catch (cause) {
    throw new TooltipError('Cannot load user options', { timeout: 0, cause });
  }
}

defineExpose({ gear });
</script>

<template>
  <aside>
    <div class="controls">
      <label>
        <span>Start date</span>
        <UIDateInput v-model="start" name="start" />
      </label>
      <label>
        <span>End date</span>
        <UIDateInput v-model="end" name="end" />
      </label>
    </div>
    <div>
      <div class="buttons">
        <UIButton
          @rejection="$event.showError('An error occurred when fetching the activities')"
          @click="loadPartial(start, end)"
        >
          Load
        </UIButton>
        <UIButton @click="loadRoutes(start, end)">Routes</UIButton>
      </div>
      <div class="buttons">
        <UIButton icon="settings" @click="settingsButton">User</UIButton>
        <UIButton icon="delete" @click="discardCache">Discard cache</UIButton>
      </div>
    </div>
    <UserLogin v-if="continueLogin" @login="continueLogin($event)" />
    <p v-else class="small" :class="{ error }" v-text="statusMessage" />
    <div class="controls">
      <label>
        <span>Sport type</span>
        <UIDropdown
          v-model="sportType"
          :options="sortedSportTypes"
          blank-value=""
          blank-label="All sports"
        />
      </label>
    </div>
  </aside>

  <UIModal v-if="user" v-model="settingsOpen" class="modal">
    <UserSettings :user="user" @logout="onLogout" />
  </UIModal>
</template>

<style scoped lang="scss">
aside {
  padding: 1em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.controls {
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

aside .buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
}

.error {
  color: red;
}

p.small {
  font-size: 0.8em;
  margin: 0;
}

.modal {
  width: 25em;
}
</style>
