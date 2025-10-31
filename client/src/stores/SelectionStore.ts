import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';

import { useActivityStore } from './ActivityStore';

export type SelectionUpdateSource = 'map' | 'list';

export const useSelectionStore = defineStore('selection', () => {
  const activityStore = useActivityStore();

  const selected = reactive<Set<string>>(new Set());

  const selectedItems = computed(() =>
    activityStore.mapItems.filter((item) => selected.has(item.id)),
  );

  const updateSource = ref<SelectionUpdateSource>();

  let base: ReadonlySet<string> = new Set();

  function getRange(to: string | undefined): Set<string> {
    if (to === undefined) return new Set([]);
    if (!base.size || base.has(to)) return new Set([to]);

    const limits = new Set([...base, to]);

    const start = activityStore.mapItems.findIndex(({ id }) => limits.has(id));
    if (start === -1) return limits;
    const end = activityStore.mapItems.findLastIndex(({ id }) => limits.has(id));
    return new Set(activityStore.mapItems.slice(start, end + 1).map(({ id }) => id));
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
    if (!ctrlKey) {
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

  return {
    selected,
    selectedItems,
    updateSource,

    selectItem,
  };
});
