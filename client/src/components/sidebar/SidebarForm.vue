<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useActivityService } from '@/services/useActivityService';
import useSportsTypes from '@/services/useSportsTypes';
import useUser from '@/services/useUser';
import { combineCallbacks } from '@/utils/functions';

import SegmentedControl from '../segmented-control/SegmentedControl.vue';
import SegmentedControlItem from '../segmented-control/SegmentedControlItem.vue';
import { TooltipError } from '../tooltip/TooltipError';
import UIButton from '../ui/UIButton.vue';
import UIButtonGroup from '../ui/UIButtonGroup.vue';
import UIDateInput from '../ui/UIDateInput.vue';
import UIDropdown from '../ui/UIDropdown.vue';
import UILabelledIcon from '../ui/UILabelledIcon.vue';
import UIModal from '../ui/UIModal.vue';
import UIMultiText from '../ui/UIMultiText.vue';
import LoadingStatus from './LoadingStatus.vue';
import UserLogin from './UserLogin.vue';
import UserSettings from './UserSettings.vue';
const start = ref<Date>();
const end = ref<Date>();

const {
  error,
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

const { sportsDropdownOptions, sportsFilter } = useSportsTypes();

function onLogout(): void {
  document.cookie = `token=;expires=${new Date(0).toUTCString()}`;
  discardCache(true, true);
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

function cancelButton() {
  cancelLoading();
  unchangedSinceLoad.value = false;
}

watch([start, end, useRoutes], () => {
  unchangedSinceLoad.value = false;
});

defineExpose({ gear });
</script>

<template>
  <aside :class="$style.sidebarForm">
    <div :class="$style.controlsGrid">
      <div :class="$style.buttons">
        <SegmentedControl
          v-slot="{ option }"
          v-model="useRoutes"
          :class="$style.segmentedControl"
          :disabled="loading"
        >
          <SegmentedControlItem :option="option(false)"> Activities </SegmentedControlItem>
          <SegmentedControlItem :option="option(true)"> Routes </SegmentedControlItem>
        </SegmentedControl>
      </div>
      <label>
        <span>Start date</span>
        <UIDateInput v-model="start" name="start" />
      </label>
      <label>
        <span>End date</span>
        <UIDateInput v-model="end" name="end" />
      </label>
      <div :class="$style.buttons">
        <UIButtonGroup>
          <UIButton @click="loadButton">
            <UIMultiText
              :texts="{ load: 'Load', reload: 'Reload' }"
              :selected="unchangedSinceLoad ? 'reload' : 'load'"
            />
          </UIButton>
          <UIButton @click="loading ? cancelButton() : discardCache(true, true)">
            <UIMultiText :selected="loading ? 'cancel' : 'discard'">
              <template #cancel> Cancel </template>
              <template #discard>
                <UILabelledIcon icon="delete"> Clear </UILabelledIcon>
              </template>
            </UIMultiText>
          </UIButton>
        </UIButtonGroup>
        <UIButton icon="settings" @click="settingsButton"> User </UIButton>
      </div>
    </div>
    <UserLogin v-if="continueLogin" @login="continueLogin($event)" />
    <LoadingStatus v-else :useRoutes :error />
    <div :class="[$style.controls, $style.row]">
      <label :class="$style.expand">
        <span>Sport type</span>
        <UIDropdown
          v-model="sportsFilter"
          :options="sportsDropdownOptions"
          blankValue=""
          blankLabel="All sports"
        />
      </label>
      <label :class="!useRoutes && $style.hidden" title="Only show starred routes">
        <span>Starred</span>
        <UIButton
          :icon="filterModel.starred ? 'star' : 'star_border'"
          @click="filterModel.starred = !filterModel.starred"
        />
      </label>
    </div>
  </aside>

  <UIModal v-if="user" v-model="settingsOpen" :class="$style.modal">
    <UserSettings :user @logout="onLogout" />
  </UIModal>
</template>

<style module lang="scss">
.sidebarForm {
  padding-inline: 1em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;

  .buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-evenly;
    align-items: center;
  }

  .segmentedControl:only-child {
    flex: 1;
  }
}

.hidden {
  visibility: hidden;
}

.controls,
.controlsGrid {
  > label {
    > span {
      min-height: 1.2em;
      font-size: 0.9em;
      font-weight: 600;
      padding-inline: 0.5rem;
      display: block;
    }

    &.expand {
      flex: 1;
    }
  }
}

.controlsGrid {
  display: grid;
  grid-template-columns: max-content max-content;
  justify-content: center;

  > label {
    grid-template-columns: subgrid;
    display: grid;
    grid-column: span 2;
    align-items: center;
  }

  > .buttons {
    grid-column: span 2;
    justify-content: space-between;
  }
}

.controls {
  min-width: 0;
  display: flex;
  padding-top: 1.2em;
  row-gap: 1.2em;
  justify-content: space-evenly;

  > label {
    display: flex;
    min-width: 0;
    margin-top: -1.2em;
    flex-direction: column;
    align-items: start;
  }
}

.modal {
  width: 25em;
}
</style>
