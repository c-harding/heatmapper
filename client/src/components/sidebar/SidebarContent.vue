<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed, nextTick, reactive, ref, watch } from 'vue';

import { useActivityService } from '@/services/useActivityService';
import { cancelTextSelection } from '@/utils/ui';

import SidebarForm from './SidebarForm.vue';
import SidebarItemList from './SidebarItemList.vue';
import SidebarCredits from './SIdebarCredits.vue';
import SidebarItemStats from './SidebarItemStats.vue';
import { combineStats } from '@/utils/stats';

function getRange(
  mapItems: readonly MapItem[],
  to: string,
  from?: string | readonly string[],
): string[] {
  if (to === undefined) return [];
  if (from === undefined) return [to];
  const fromArray: string[] = [from].flat();
  if (fromArray.includes(to)) return fromArray;

  const start = mapItems.findIndex(({ id }) => to === id || fromArray.includes(id));
  if (start === -1) return [to, ...fromArray];
  const end = mapItems.findLastIndex(({ id }) => to === id || fromArray.includes(id));
  return mapItems.slice(start, end + 1).map(({ id }) => id);
}

const selected = defineModel<readonly string[]>('selected', { required: true });

const emit = defineEmits<{
  'zoom-to-selected': [];
  'focus-sidebar': [];
}>();

const { mapItems } = useActivityService();

const totals = computed(() => combineStats(mapItems.value));

let localSelected: readonly string[] | undefined;
let selectionBase: readonly string[] | undefined;

const sidebarItemListRef = ref<HTMLElement>();

function toggleInArray<T>(array: readonly T[], item: T): T[] {
  if (array.includes(item)) return array.filter((x) => x !== item);
  else return [...array, item];
}

function getSelectedItems(id: string, e: MouseEvent): string[] {
  if (e.metaKey || e.ctrlKey) return toggleInArray(selected.value, id);
  if (e.shiftKey) return getRange(mapItems.value, id, selectionBase);
  return [id];
}

function select(id: string, e: MouseEvent): void {
  if (e.shiftKey) cancelTextSelection();
  const newSelected = getSelectedItems(id, e);
  if (newSelected.length === 1) selectionBase = newSelected;
  localSelected = reactive(newSelected);
  selected.value = localSelected;
}

function forceSelect(): void {
  cancelTextSelection();
  emit('zoom-to-selected');
}

watch(selected, async (selected) => {
  if (selected !== localSelected) {
    localSelected = selected;
    selectionBase = selected;
    if (selected.length !== 0) emit('focus-sidebar');
    await nextTick();
    const el = sidebarItemListRef.value?.querySelector('.selected');
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
});
</script>

<template>
  <div class="sidebar-content">
    <SidebarForm />
    <div v-if="mapItems?.length" class="sidebar-totals">
      <span class="label">Total:</span>
      <SidebarItemStats :item="totals" />
    </div>
    <div ref="sidebarItemListRef">
      <SidebarItemList
        v-model:selected="selected"
        :items="mapItems"
        @select="select"
        @force-select="forceSelect"
      />
    </div>

    <SidebarCredits />
  </div>
</template>

<style lang="scss" scoped>
.sidebar-content {
  flex: 1;
  padding: 0 0 1em;
  display: flex;
  flex-direction: column;
}

.sidebar-totals {
  display: flex;
  flex-direction: row;
  gap: 0.25em;
  padding-inline: 1em;
  padding-bottom: 1em;

  > .label {
    font-size: 0.75em;
  }
}
</style>
