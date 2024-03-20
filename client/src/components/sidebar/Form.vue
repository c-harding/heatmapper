<script setup lang="ts">
import { computed, ref } from 'vue';

import { useActivityService } from '@/services/useActivityService';
import useUser from '@/services/useUser';
import { sportGroups, sportTypes } from '@/sportTypes';
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
  sportType,
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

const sortedSportTypes = [...Object.entries(sportGroups), ...Object.entries(sportTypes)]
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

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

async function loadButton() {
  loading.value = true;
  try {
    await load(start.value, end.value);
  } catch (cause) {
    const message = `An error occurred when fetching the ${
      useRoutes.value ? 'activities' : 'routes'
    }`;
    console.error(message, cause);
    throw new TooltipError(message, { timeout: 0, cause });
  }
  loading.value = false;
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
        <SegmentedControl v-slot="{ option }" v-model="useRoutes" :disabled="loading">
          <SegmentedControlItem :option="option(false)">Activities</SegmentedControlItem>
          <SegmentedControlItem :option="option(true)">Routes</SegmentedControlItem>
        </SegmentedControl>
        <UIButton @click="loadButton">Load</UIButton>
      </div>
      <div class="buttons">
        <UIButton icon="settings" @click="settingsButton">User</UIButton>
        <UIButton
          :icon="loading ? 'close' : 'delete'"
          @click="loading ? cancelLoading() : discardCache(true)"
        >
          <UIMultiText
            :texts="{ false: 'Discard cache', true: 'Cancel loading' }"
            :selected="loading ? 'true' : 'false'"
          />
        </UIButton>
      </div>
    </div>
    <UserLogin v-if="continueLogin" @login="continueLogin($event)" />
    <LoadingStatus v-else :stats="stats" :use-routes="useRoutes" :error="error" />
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

.modal {
  width: 25em;
}
</style>
