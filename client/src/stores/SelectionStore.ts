import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';

import { groupMapItems } from '@/utils/groupMapItems';

import { type MapItemGroup, useActivityStore } from './ActivityStore';

export type SelectionUpdateSource = 'map' | 'list' | 'options';

export const useSelectionStore = defineStore('selection', () => {
  const activityStore = useActivityStore();

  const selectionMode = ref(false);

  const selected = reactive<Set<string>>(new Set());

  // The locked selection is kept separate for routes and non-routes, to allow customisation of the ghost mode
  const lockedSelections = reactive<Map<typeof activityStore.useRoutes, ReadonlySet<string>>>(
    new Map(),
  );
  const lockedSelection = computed({
    get() {
      return lockedSelections.get(activityStore.useRoutes);
    },
    set(value: ReadonlySet<string> | undefined) {
      if (value) lockedSelections.set(activityStore.useRoutes, value);
      else lockedSelections.delete(activityStore.useRoutes);
    },
  });

  const visibleItems = computed(() => {
    const value = lockedSelection.value;
    return value
      ? activityStore.mapItems.filter((item) => value.has(item.id))
      : activityStore.mapItems;
  });

  const visibleGroupedItems = computed<readonly MapItemGroup[]>(() =>
    groupMapItems(visibleItems.value, activityStore.groupLevel),
  );

  const selectedItems = computed(() => visibleItems.value.filter((item) => selected.has(item.id)));

  const updateSource = ref<SelectionUpdateSource>();

  let base: ReadonlySet<string> = new Set();

  function getRange(to: string[]): ReadonlySet<string> {
    const toSet = new Set(to);
    if (base.isSupersetOf(toSet)) return base;
    if (!base.size) return toSet;

    const limits = new Set<string>([...base, ...to]);

    const start = visibleItems.value.findIndex(({ id }) => limits.has(id));
    if (start === -1) return limits;
    const end = visibleItems.value.findLastIndex(({ id }) => limits.has(id));
    return new Set(visibleItems.value.slice(start, end + 1).map(({ id }) => id));
  }

  function toggleAll(ids: string[]) {
    if (ids.every((id) => selected.has(id))) {
      ids.forEach((id) => selected.delete(id));
    } else {
      ids.forEach((id) => selected.add(id));
    }
  }

  /**
   * Make a selection.
   *
   * When the ctrl or shift keys are pressed, the selection is modified appropriately.
   *
   * @param id The new item to select.
   * @param source The source of the event:
   *                 `map` means a click on the map.
   *                 `list` means a click in the list in the sidebar.
   *                 `options` means a click in the selection options panel.
   * @param ctrlKey Whether the ctrl/meta key is pressed.
   *                When true, the selection is toggled rather than replaced.
   * @param shiftKey Whether the shift key is pressed.
   *                 When true, a range is selected, rather than a single value.
   *                 The base of this range is the previous selection without the shift key.
   *                 Do not set this for events on the map.
   */
  function select(
    ids: string[] | string,
    source: SelectionUpdateSource,
    ctrlKey = false,
    shiftKey = false,
  ) {
    const flatIds = [ids].flat();

    if (!ctrlKey && !selectionMode.value) {
      selected.clear();
    }

    if (shiftKey) {
      const range = getRange(flatIds);

      range.forEach((item) => selected.add(item));

      if (range.size === 1) {
        base = new Set(range);
      }
    } else if (ids.length) {
      base = new Set(flatIds);
      toggleAll(flatIds);
    }

    if (source !== 'list') {
      base = new Set(selected);
    }

    updateSource.value = source;
  }

  function lockSelection() {
    if (selected.size === 0) return;
    lockedSelection.value = new Set(selected);
    selected.clear();
    updateSource.value = 'options';
  }

  function releaseSelection() {
    if (!lockedSelection.value) return;
    selected.clear();
    lockedSelection.value.forEach((id) => selected.add(id));
    lockedSelection.value = undefined;
    updateSource.value = 'options';
  }

  function clearSelection() {
    selected.clear();
    updateSource.value = 'options';
  }

  return {
    selectionMode,
    selected,
    selectedItems,
    updateSource,
    lockedSelections,
    lockedSelection,
    visibleItems,
    visibleGroupedItems,

    select,
    lockSelection,
    releaseSelection,
    clearSelection,
  };
});
