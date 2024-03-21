<script setup lang="ts">
import { routeTypeMap, sportGroups, sportTypes } from '@strava-heatmapper/shared/interfaces';
import { computed, ref, watch } from 'vue';

import { doesSportTypeMatch, useActivityService } from '@/services/useActivityService';
import useUser from '@/services/useUser';
import { combineCallbacks } from '@/utils/functions';

import SegmentedControl from '../segmented-control/SegmentedControl.vue';
import SegmentedControlItem from '../segmented-control/SegmentedControlItem.vue';
import { TooltipError } from '../tooltip/TooltipError';
import UIButton from '../ui/UIButton.vue';
import UIDateInput from '../ui/UIDateInput.vue';
import UIDropdown from '../ui/UIDropdown.vue';
import UIModal from '../ui/UIModal.vue';
import UIMultiText from '../ui/UIMultiText.vue';
import LoadingStatus from './LoadingStatus.vue';
import UserLogin from './UserLogin.vue';
import UserSettings from './UserSettings.vue';

const start = ref<Date>();
const end = ref<Date>();

const {
  error,
  stats,
  filterModel,
  gear,
  useRoutes,
  cancelLoading,
  discardCache,
  load,
  continueLogin: continueActivityLogin,
} = useActivityService();

const { user, continueLogin: continueUserLogin, getUser } = useUser();

const continueLogin = computed(() =>
  combineCallbacks([continueUserLogin.value, continueActivityLogin.value]),
);

const settingsOpen = ref(false);

const sortedSportTypes = computed(() =>
  [...Object.entries(sportGroups), ...Object.entries(sportTypes)]
    .map(([value, label]) => ({
      value,
      label,
      disabled:
        useRoutes.value &&
        !Object.values(routeTypeMap).some((sportType) => doesSportTypeMatch(value, sportType)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
);

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

const loading = ref(false);

const unchangedSinceLoad = ref(false);

async function loadButton() {
  loading.value = true;

  /** Keep existing data unless the form is unchanged since the last click */
  const partialLoad = !unchangedSinceLoad.value;

  try {
    await load(partialLoad, start.value, end.value);
  } catch (cause) {
    const message = `An error occurred when fetching the ${
      useRoutes.value ? 'activities' : 'routes'
    }`;
    console.error(message, cause);
    throw new TooltipError(message, { timeout: 0, cause });
  }
  loading.value = false;
  unchangedSinceLoad.value = true;
}

watch([start, end, useRoutes], () => {
  unchangedSinceLoad.value = false;
});

defineExpose({ gear });
</script>

<template>
  <aside>
    <div class="controls row">
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
        <SegmentedControl v-slot="{ option }" v-model="useRoutes" :disabled="loading">
          <SegmentedControlItem :option="option(false)">Activities</SegmentedControlItem>
          <SegmentedControlItem :option="option(true)">Routes</SegmentedControlItem>
        </SegmentedControl>
        <UIButton @click="loadButton">
          <UIMultiText
            :texts="{ false: 'Load', true: 'Reload' }"
            :selected="unchangedSinceLoad ? 'true' : 'false'"
          />
        </UIButton>
      </div>
      <div class="buttons">
        <UIButton icon="settings" @click="settingsButton">User</UIButton>
        <UIButton @click="loading ? cancelLoading() : discardCache(true)">
          <UIMultiText
            :texts="{ discard: 'Discard cache', cancel: 'Cancel loading' }"
            :icons="{ discard: 'delete' }"
            :selected="loading ? 'cancel' : 'discard'"
          />
        </UIButton>
      </div>
    </div>
    <UserLogin v-if="continueLogin" @login="continueLogin($event)" />
    <LoadingStatus v-else :stats="stats" :use-routes="useRoutes" :error="error" />
    <div class="controls row">
      <label>
        <span>Sport type</span>
        <UIDropdown
          v-model="filterModel.sportType"
          :options="sortedSportTypes"
          blank-value=""
          blank-label="All sports"
        />
      </label>
      <label :class="{ hidden: !useRoutes }" title="Only show starred routes">
        <span>Starred</span>
        <UIButton
          :icon="filterModel.starred ? 'star' : 'star_border'"
          @click="filterModel.starred = !filterModel.starred"
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

.hidden {
  visibility: hidden;
}

.controls {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-top: 1.2em;

  &.row {
    flex-direction: row;
  }

  label {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  &.row label {
    margin-top: -1.2em;
    flex-direction: column;
    align-items: start;

    span {
      height: 1.2em;
      font-size: 0.9em;
      font-weight: bold;
      padding-inline: 0.5rem;
      display: block;
    }
  }
}

aside .buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
}

.modal {
  width: 25em;
}
</style>
