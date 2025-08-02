<script setup lang="ts">
import { computed, ref } from 'vue';

import { useActivityStore } from '@/stores/ActivityStore';
import { useSelectionStore } from '@/stores/SelectionStore';
import {
  countFocusedActivities,
  countFocusedRoutes,
  countSelectedActivities,
  countSelectedRoutes,
} from '@/utils/strings';

import UIVerticalTab from '../ui/tabs/UIVerticalTab.vue';
import { type Tab } from '../ui/tabs/UIVerticalTabContainer.vue';
import UIButton from '../ui/UIButton.vue';
import UIButtonGroup from '../ui/UIButtonGroup.vue';
import UICheckbox from '../ui/UICheckbox.vue';
import SelectionHelp from './SelectionHelp.vue';

defineProps<{ tab: Tab<string> }>();

const activityStore = useActivityStore();
const selectionStore = useSelectionStore();

const summaryItems = computed(() =>
  [
    selectionStore.lockedSelection?.size &&
      (activityStore.useRoutes
        ? countFocusedRoutes(selectionStore.lockedSelection.size)
        : countFocusedActivities(selectionStore.lockedSelection.size)),
    selectionStore.selected.size &&
      (activityStore.useRoutes
        ? countSelectedRoutes(selectionStore.selected.size)
        : countSelectedActivities(selectionStore.selected.size)),
  ].filter((string): string is string => !!string),
);

function reset() {
  selectionStore.selectionMode = false;
  selectionStore.releaseSelection();
  selectionStore.selectItem(undefined, 'options');
}

const showHelp = ref(false);
</script>

<template>
  <UIVerticalTab
    :tab
    icon="done_all"
    heading="Selection"
    :summaryItems
    summaryEmpty="None selected"
    :resetDisabled="
      selectionStore.selectionMode === false &&
      !selectionStore.lockedSelection &&
      !selectionStore.selected.size
    "
    @reset="reset"
    @help="showHelp = true"
  >
    <template #expanded>
      <UICheckbox v-model="selectionStore.selectionMode">Multiple selection mode</UICheckbox>
      <UIButtonGroup>
        <UIButton
          :disabled="selectionStore.selected.size === 0"
          icon="delete"
          @click="selectionStore.lockSelection"
          >Clear</UIButton
        >
        <UIButton
          :disabled="selectionStore.selected.size === 0"
          icon="loupe"
          @click="selectionStore.lockSelection"
          >Focus</UIButton
        >
        <UIButton
          v-if="selectionStore.lockedSelection"
          icon="all_out"
          @click="selectionStore.releaseSelection"
          >Release</UIButton
        >
      </UIButtonGroup>
    </template>
  </UIVerticalTab>
  <SelectionHelp v-model="showHelp" />
</template>
