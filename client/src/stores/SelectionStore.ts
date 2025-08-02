import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';

import { useActivityStore } from './ActivityStore';

export type SelectionUpdateSource = 'map' | 'list' | 'options';

export const useSelectionStore = defineStore('selection', () => {
  const activityStore = useActivityStore();

  const selectionMode = ref(false);

  const selected = reactive<Set<string>>(new Set());
  const lockedSelection = ref<ReadonlySet<string>>();

  const visibleItems = computed(() => {
    const value = lockedSelection.value;
    return value
      ? activityStore.mapItems.filter((item) => value.has(item.id))
      : activityStore.mapItems;
  });
  const selectedItems = computed(() => visibleItems.value.filter((item) => selected.has(item.id)));

  const updateSource = ref<SelectionUpdateSource>();

  let base: ReadonlySet<string> = new Set();

  function getRange(to: string | undefined): Set<string> {
    if (to === undefined) return new Set([]);
    if (!base.size || base.has(to)) return new Set([to]);

    const limits = new Set([...base, to]);

    const start = visibleItems.value.findIndex(({ id }) => limits.has(id));
    if (start === -1) return limits;
    const end = visibleItems.value.findLastIndex(({ id }) => limits.has(id));
    return new Set(visibleItems.value.slice(start, end + 1).map(({ id }) => id));
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
  function selectItem(
    id: string | undefined,
    source: SelectionUpdateSource,
    ctrlKey = false,
    shiftKey = false,
  ) {
    if (!ctrlKey && !selectionMode.value) {
      selected.clear();
    }

    if (shiftKey) {
      const range = getRange(id);

      range.forEach((item) => selected.add(item));

      if (range.size === 1) {
        base = new Set(range);
      }
    } else if (id) {
      base = new Set([id]);
      selected.delete(id) || selected.add(id);
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

  return {
    selectionMode,
    selected,
    selectedItems,
    updateSource,
    lockedSelection,
    visibleItems,

    selectItem,
    lockSelection,
    releaseSelection,
  };
});
