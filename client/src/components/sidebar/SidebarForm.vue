<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useExpandableGroups } from '@/services/useExpandableGroups';
import { GroupLevel, useActivityStore } from '@/stores/ActivityStore';
import { useUserStore } from '@/stores/UserStore';
import { combineCallbacks } from '@/utils/functions';
import { useResettingRef } from '@/utils/resetting-ref';

import SegmentedControl from '../segmented-control/SegmentedControl.vue';
import SegmentedControlItem from '../segmented-control/SegmentedControlItem.vue';
import { TooltipError } from '../tooltip/TooltipError';
import UIVerticalTabContainer from '../ui/tabs/UIVerticalTabContainer.vue';
import UIButton from '../ui/UIButton.vue';
import UIButtonGroup from '../ui/UIButtonGroup.vue';
import UIDropdown, { type DropdownOption } from '../ui/UIDropdown.vue';
import UILabelledIcon from '../ui/UILabelledIcon.vue';
import UIModal from '../ui/UIModal.vue';
import UIMultiText from '../ui/UIMultiText.vue';
import controlsStyle from './controls.module.scss';
import LoadingStatus from './LoadingStatus.vue';
import SidebarDateFilter from './SidebarDateFilter.vue';
import SidebarFilter from './SidebarFilter.vue';
import UserLogin from './UserLogin.vue';
import UserSettings from './UserSettings.vue';

const start = ref<Date>();
const end = ref<Date>();

const activityStore = useActivityStore();

const userStore = useUserStore();

const continueLogin = computed(() =>
  combineCallbacks([userStore.continueLogin, activityStore.continueLogin]),
);

const settingsOpen = ref(false);

const groupLevels: DropdownOption[] = [
  { value: GroupLevel.OFF, label: 'None' },
  { value: GroupLevel.WEEKLY_MO, label: 'Week (Mon–Sun)' },
  { value: GroupLevel.WEEKLY_SA, label: 'Week (Sat–Fri)' },
  { value: GroupLevel.WEEKLY_SU, label: 'Week (Sun–Sat)' },
  { value: GroupLevel.MONTHLY, label: 'Month' },
  { value: GroupLevel.YEARLY, label: 'Year' },
];

function onLogout(): void {
  document.cookie = `token=;expires=${new Date(0).toUTCString()}`;
  activityStore.discardCache(true, true);
  settingsOpen.value = false;
}

async function settingsButton() {
  try {
    await userStore.getUser();
    settingsOpen.value = true;
  } catch (cause) {
    throw new TooltipError('Cannot load user options', { timeout: 0, cause });
  }
}

const loading = ref(false);

const unchangedSinceLoad = useResettingRef(false, 60 * 60 * 1000);

const expandableGroups = useExpandableGroups();

async function loadButton() {
  loading.value = true;

  /** Keep existing data unless the form is unchanged since the last click */
  const partialLoad = !unchangedSinceLoad.value;

  try {
    await activityStore.load(partialLoad, start.value, end.value);
  } catch (cause) {
    const message = `An error occurred when fetching the ${activityStore.useRoutes ? 'activities' : 'routes'}`;
    console.error(message, cause);
    throw new TooltipError(message, { timeout: 0, cause });
  }
  loading.value = false;
  unchangedSinceLoad.value = true;
}

function cancelButton() {
  activityStore.cancelLoading();
  unchangedSinceLoad.value = false;
}

function clearButton() {
  activityStore.discardCache(
    { activities: !activityStore.useRoutes, routes: activityStore.useRoutes },
    true,
  );
  unchangedSinceLoad.value = false;
}

watch([start, end, () => activityStore.useRoutes], () => {
  unchangedSinceLoad.value = false;
});
</script>

<template>
  <aside :class="$style.sidebarForm">
    <div :class="[controlsStyle.grid, controlsStyle.center]">
      <div :class="controlsStyle.buttons">
        <SegmentedControl
          v-slot="{ option }"
          v-model="activityStore.useRoutes"
          :class="controlsStyle.segmentedControl"
          :disabled="loading"
        >
          <SegmentedControlItem :option="option(false)"> Activities </SegmentedControlItem>
          <SegmentedControlItem :option="option(true)"> Routes </SegmentedControlItem>
        </SegmentedControl>
      </div>
    </div>
    <UIVerticalTabContainer v-slot="{ makeTab }">
      <SidebarDateFilter v-model:start="start" v-model:end="end" :tab="makeTab('dates')" />
    </UIVerticalTabContainer>

    <div :class="[controlsStyle.grid, controlsStyle.center]">
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
    <LoadingStatus v-else :useRoutes="activityStore.useRoutes" :error="activityStore.error" />
    <UIVerticalTabContainer v-slot="{ makeTab }">
      <SidebarFilter :tab="makeTab('filter')" />
    </UIVerticalTabContainer>
    <div :class="[$style.controls, $style.row]">
      <label>
        <span>Group by</span>
        <UIDropdown v-model="activityStore.groupLevel" :options="groupLevels" />
      </label>
    </div>
  </aside>

  <UIModal
    v-if="userStore.user"
    v-model="settingsOpen"
    :class="$style.modal"
    heading="User settings"
  >
    <UserSettings :user="userStore.user" @logout="onLogout" />
  </UIModal>
</template>

<style module lang="scss">
.sidebarForm {
  padding-inline: 1em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;

  .controlIconButton {
    margin: 8px;
  }
}

.modal {
  width: 25em;
}
</style>
