<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useActivityService } from '@/services/useActivityService';
import useUser from '@/services/useUser';
import { combineCallbacks } from '@/utils/functions';
import { useResettingRef } from '@/utils/resetting-ref';

import SegmentedControl from '../segmented-control/SegmentedControl.vue';
import SegmentedControlItem from '../segmented-control/SegmentedControlItem.vue';
import { TooltipError } from '../tooltip/TooltipError';
import UIButton from '../ui/UIButton.vue';
import UIButtonGroup from '../ui/UIButtonGroup.vue';
import UIDateInput from '../ui/UIDateInput.vue';
import UILabelledIcon from '../ui/UILabelledIcon.vue';
import UIModal from '../ui/UIModal.vue';
import UIMultiText from '../ui/UIMultiText.vue';
import controlsStyle from './controls.module.scss';
import LoadingStatus from './LoadingStatus.vue';
import SidebarFilter from './SidebarFilter.vue';
import UserLogin from './UserLogin.vue';
import UserSettings from './UserSettings.vue';
const start = ref<Date>();
const end = ref<Date>();

const {
  error,
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

const unchangedSinceLoad = useResettingRef(false, 60 * 60 * 1000);

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

function clearButton() {
  discardCache({ activities: !useRoutes.value, routes: useRoutes.value }, true);
  unchangedSinceLoad.value = false;
}

watch([start, end, useRoutes], () => {
  unchangedSinceLoad.value = false;
});

defineExpose({ gear });
</script>

<template>
  <aside :class="$style.sidebarForm">
    <div :class="[controlsStyle.grid, controlsStyle.center]">
      <div :class="controlsStyle.buttons">
        <SegmentedControl
          v-slot="{ option }"
          v-model="useRoutes"
          :class="controlsStyle.segmentedControl"
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
      <div :class="controlsStyle.buttons">
        <UIButtonGroup>
          <UIButton @click="loadButton">
            <UIMultiText
              :texts="{ load: 'Load', reload: 'Reload' }"
              :selected="unchangedSinceLoad ? 'reload' : 'load'"
            />
          </UIButton>
          <UIButton @click="loading ? cancelButton() : clearButton()">
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
    <SidebarFilter />
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
}

.modal {
  width: 25em;
}
</style>
