<script setup lang="ts">
import { computed, ref, watch } from 'vue';

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
import UIMultiText from '../ui/UIMultiText.vue';
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

/** All three things a reset clears, and whether they were routes or activities. */
const previousSelection = ref<{
  useRoutes: boolean;
  multiSelectionMode: boolean;
  lockedSelection?: ReadonlySet<string>;
  selected: ReadonlySet<string>;
}>();

/** The ids in a set that would come back: loaded, and past the filter the focus narrows */
const loadedIds = computed(() => new Set(activityStore.mapItems.map(({ id }) => id)));
const stillLoaded = (ids: ReadonlySet<string>) =>
  new Set([...ids].filter((id) => loadedIds.value.has(id)));

/**
 * A focus is held per item type, so one taken in the other belongs to items that are not here.
 * Only offered when something would come back, as a focus on nothing would leave the map blank,
 * and not mid-load, when an undo would restore only the items back so far, for good.
 */
const restorable = computed(() => {
  if (previousSelection.value?.useRoutes !== activityStore.useRoutes || activityStore.loading) {
    return false;
  }
  const { lockedSelection, multiSelectionMode, selected } = previousSelection.value;
  if (lockedSelection) return stillLoaded(lockedSelection).size > 0;
  return multiSelectionMode || stillLoaded(selected).size > 0;
});

// Any change since the reset replaces it, except a switch between routes and activities. In sync,
// and stored only after the reset's own changes, so that those do not count.
watch(
  [
    () => selectionStore.selected.size,
    () => selectionStore.multiSelectionMode,
    () => selectionStore.lockedSelections.get(false),
    () => selectionStore.lockedSelections.get(true),
  ],
  () => {
    previousSelection.value = undefined;
  },
  { flush: 'sync' },
);

const resetState = computed(() =>
  anythingActive.value ? 'reset' : restorable.value ? 'undo' : 'initial',
);

function resetOrRestore() {
  if (anythingActive.value) {
    const previous = {
      useRoutes: activityStore.useRoutes,
      multiSelectionMode: selectionStore.multiSelectionMode,
      lockedSelection: selectionStore.lockedSelection,
      selected: new Set(selectionStore.selected),
    };
    selectionStore.multiSelectionMode = false;
    selectionStore.releaseSelection();
    selectionStore.clearSelection();
    previousSelection.value = previous;
  } else if (previousSelection.value && restorable.value) {
    const { multiSelectionMode, lockedSelection, selected } = previousSelection.value;
    selectionStore.clearSelection();
    selectionStore.multiSelectionMode = multiSelectionMode;
    selectionStore.lockedSelection = lockedSelection && stillLoaded(lockedSelection);
    stillLoaded(selected).forEach((id) => selectionStore.selected.add(id));
  }
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
      <UIButton
        ghost
        :disabled="resetState === 'initial'"
        :icon="resetState === 'undo' ? 'undo' : 'settings_backup_restore'"
        @click="resetOrRestore"
      >
        <UIMultiText
          :texts="{ reset: 'Reset', undo: 'Undo' }"
          :selected="resetState === 'undo' ? 'undo' : 'reset'"
        />
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
