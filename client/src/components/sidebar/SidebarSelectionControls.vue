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

const focusedSummary = computed(() => {
  const size = selectionStore.lockedSelection?.size;
  if (!size) return undefined;
  return activityStore.useRoutes ? countFocusedRoutes(size) : countFocusedActivities(size);
});

const summary = computed(() =>
  [selectionStore.multiSelectionMode && 'Multiple selection mode', focusedSummary.value].filter(
    (string): string is string => !!string,
  ),
);

const summaryEmpty = computed(() => {
  const size = selectionStore.selected.size;
  if (!size) return 'None selected';
  return activityStore.useRoutes ? countSelectedRoutes(size) : countSelectedActivities(size);
});

const controlsActive = computed(
  () => selectionStore.multiSelectionMode || !!selectionStore.lockedSelection,
);

const anythingActive = computed(() => controlsActive.value || selectionStore.selected.size > 0);

function reset() {
  selectionStore.multiSelectionMode = false;
  selectionStore.releaseSelection();
  selectionStore.clearSelection();
}

const showHelp = ref(false);

function openHelp() {
  showHelp.value = true;
}
</script>

<template>
  <UIVerticalTab
    :tab
    icon="done_all"
    heading="Selection"
    :summary
    :summaryEmpty
    :isActive="controlsActive"
  >
    <template #meta>
      <UIButton ghost icon="help" @click="openHelp">Help</UIButton>
      <UIButton ghost icon="settings_backup_restore" :disabled="!anythingActive" @click="reset">
        Reset
      </UIButton>
    </template>
    <template #expanded>
      <p v-if="focusedSummary" :class="$style.focused">{{ focusedSummary }}</p>
      <UICheckbox v-model="selectionStore.multiSelectionMode">Multiple selection mode</UICheckbox>
      <UIButtonGroup>
        <UIButton
          :disabled="selectionStore.selected.size === 0"
          icon="delete"
          @click="selectionStore.clearSelection"
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

<style lang="scss" module>
.focused {
  margin: 0 0 0.25rem;
  padding-inline: 0.5rem;
  font-size: 0.9em;
  font-style: italic;
  color: var(--color-mid);
}
</style>
