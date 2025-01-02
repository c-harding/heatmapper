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
import SidebarGroup from './SidebarGroup.vue';
import { provideExpandableGroups } from '@/services/useExpandableGroups';

function getRange(
  mapItems: readonly MapItem[],
  to: string | readonly string[],
  from?: string | readonly string[],
): string[] {
  if (to === undefined) return [];
  const toArray: string[] = [to].flat();
  if (from === undefined) return toArray;
  const fromArray: string[] = [from].flat();
  if (toArray.every((to) => fromArray.includes(to))) return fromArray;

  const start = mapItems.findIndex(({ id }) => toArray.includes(id) || fromArray.includes(id));
  if (start === -1) return [...toArray, ...fromArray];
  const end = mapItems.findLastIndex(({ id }) => toArray.includes(id) || fromArray.includes(id));
  return mapItems.slice(start, end + 1).map(({ id }) => id);
}

const selected = defineModel<readonly string[]>('selected', { required: true });

const emit = defineEmits<{
  'zoom-to-selected': [];
  'focus-sidebar': [];
}>();

const { mapItems, groupedMapItems, groupLevel } = useActivityService();

provideExpandableGroups();

const totals = computed(() => combineStats(mapItems.value));

let localSelected: readonly string[] | undefined;
let selectionBase: readonly string[] | undefined;

const sidebarItemListRef = ref<HTMLElement>();

function toggleInArray<T>(array: readonly T[], items: T[]): T[] {
  if (items.every((item) => array.includes(item))) return array.filter((x) => !items.includes(x));
  else return [...array, ...items];
}

function getSelectedItems(ids: string[], e: MouseEvent): string[] {
  if (e.metaKey || e.ctrlKey) return toggleInArray(selected.value, ids);
  if (e.shiftKey) return getRange(mapItems.value, ids, selectionBase);
  return ids;
}

function select(ids: string | string[], e: MouseEvent): void {
  const flatIds = [ids].flat();
  if (e.shiftKey) cancelTextSelection();
  const newSelected = getSelectedItems(flatIds, e);
  if (newSelected.length === flatIds.length) selectionBase = newSelected;
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
    <div v-if="mapItems" class="sidebar-totals">
      <span class="label">Total:</span>
      <SidebarItemStats :item="totals" />
    </div>
    <div ref="sidebarItemListRef">
      <template v-if="groupLevel">
        <SidebarGroup
          v-for="group of groupedMapItems"
          :key="group.date"
          v-model:selected="selected"
          :group="group"
          @select="select"
          @force-select="forceSelect"
        />
      </template>
      <SidebarItemList
        v-else
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
