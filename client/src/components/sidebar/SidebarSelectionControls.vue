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

/** Nothing else says this: the totals below count a selection, never a focus. */
const focused = computed(() => {
  const { size } = selectionStore.lockedSelection ?? {};
  if (!size) return undefined;
  return activityStore.useRoutes ? countFocusedRoutes(size) : countFocusedActivities(size);
});

const summary = computed(() =>
  [
    focused.value,
    selectionStore.selected.size &&
      (activityStore.useRoutes
        ? countSelectedRoutes(selectionStore.selected.size)
        : countSelectedActivities(selectionStore.selected.size)),
  ].filter((string): string is string => !!string),
);

/** The mode, when there are no counts to report. */
const summaryEmpty = computed(() =>
  selectionStore.multiSelectionMode ? 'Multiple selection' : 'None selected',
);

/** A mode or a focus, not a selection, which comes and goes as you click around. */
const isActive = computed(
  () => selectionStore.multiSelectionMode || !!selectionStore.lockedSelection,
);

/** Counts the selection too, since reset would clear it. */
const nothingToReset = computed(() => !isActive.value && !selectionStore.selected.size);

/** All three things a reset clears, and the mode it cleared them in. */
const reset = ref<{
  useRoutes: boolean;
  multiSelectionMode: boolean;
  lockedSelection?: ReadonlySet<string>;
  selected: ReadonlySet<string>;
}>();

/** The ids in a set that are still loaded, as a discard or another user's load removes them */
const loadedIds = computed(() => new Set(activityStore.allMapItems.map(({ id }) => id)));
const stillLoaded = (ids: ReadonlySet<string>) =>
  new Set([...ids].filter((id) => loadedIds.value.has(id)));

/**
 * Mid-load, only some of the items are back, and an undo would restore only those for good. A load
 * has started before its first count arrives, while the cache fills the list.
 */
const loading = computed(() => {
  const { inCache, cleared, closed, finding } = activityStore.stats;
  return !inCache && !cleared && !closed && !finding?.finished;
});

/**
 * A focus is held per mode, so one taken in the other belongs to items that are not here. Only
 * offered when something would come back, as a focus on nothing would leave the map blank.
 */
const restorable = computed(() => {
  const snapshot = reset.value;
  if (snapshot?.useRoutes !== activityStore.useRoutes || loading.value) return false;
  const { lockedSelection, multiSelectionMode, selected } = snapshot;
  if (lockedSelection) return stillLoaded(lockedSelection).size > 0;
  return multiSelectionMode || stillLoaded(selected).size > 0;
});

// Anything done since the reset replaces it, as an undo would bring back a state long since moved
// on from. The selection and its mode are shared by both modes; a focus belongs to its own.
watch(
  () => selectionStore.selected.size > 0 || selectionStore.multiSelectionMode,
  (busy) => {
    if (busy) reset.value = undefined;
  },
);
watch(
  () => activityStore.useRoutes === reset.value?.useRoutes && !!selectionStore.lockedSelection,
  (focused) => {
    if (focused) reset.value = undefined;
  },
);

const resetState = computed(() =>
  nothingToReset.value ? (restorable.value ? 'undo' : 'initial') : 'reset',
);

function resetOrRestore() {
  if (!nothingToReset.value) {
    reset.value = {
      useRoutes: activityStore.useRoutes,
      multiSelectionMode: selectionStore.multiSelectionMode,
      lockedSelection: selectionStore.lockedSelection,
      selected: new Set(selectionStore.selected),
    };
    selectionStore.multiSelectionMode = false;
    selectionStore.releaseSelection();
    selectionStore.clearSelection();
  } else if (reset.value && restorable.value) {
    selectionStore.clearSelection();
    selectionStore.multiSelectionMode = reset.value.multiSelectionMode;
    const { lockedSelection, selected } = reset.value;
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
  <UIVerticalTab :tab icon="done_all" heading="Selection" :summary :summaryEmpty :isActive>
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
      <p v-if="focused" :class="$style.focused">{{ focused }}</p>
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
