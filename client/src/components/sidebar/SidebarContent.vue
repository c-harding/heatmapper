<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed, nextTick, reactive, ref, watch } from 'vue';

import { useActivityService } from '@/services/useActivityService';
import { provideExpandableGroups } from '@/services/useExpandableGroups';
import { combineStats } from '@/utils/stats';
import { cancelTextSelection } from '@/utils/ui';

import SidebarCredits from './SIdebarCredits.vue';
import SidebarForm from './SidebarForm.vue';
import SidebarGroup from './SidebarGroup.vue';
import SidebarItemCount from './SidebarItemCount.vue';
import SidebarItemList from './SidebarItemList.vue';
import SidebarItemStats from './SidebarItemStats.vue';

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
  zoomToSelected: [];
  focusSidebar: [];
  scrollToSelected: [];
}>();

const { mapItems, groupedMapItems, groupLevel } = useActivityService();

provideExpandableGroups();

const totals = computed(() => combineStats(mapItems.value, selected.value));

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
  emit('zoomToSelected');
}

watch(selected, async (selected) => {
  if (selected !== localSelected) {
    localSelected = selected;
    selectionBase = selected;
    if (selected.length !== 0) emit('focusSidebar');
    await nextTick();
    emit('scrollToSelected');
  }
});
</script>

<template>
  <div :class="$style.sidebarContent">
    <SidebarForm />
    <div
      v-if="mapItems?.length"
      :class="[$style.sidebarTotals, totals.showSelected && $style.stickyTotals]"
    >
      <SidebarItemCount :counts="totals" />
      <SidebarItemStats :item="totals" />
    </div>
    <div ref="sidebarItemListRef">
      <template v-if="groupLevel">
        <SidebarGroup
          v-for="group of groupedMapItems"
          :key="group.date"
          v-model:selected="selected"
          :group
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

<style module lang="scss">
.sidebarContent {
  flex: 1;
  padding-block: 1em;
  display: flex;
  flex-direction: column;
  gap: 1em;

  section:has(& .stickyTotals) {
    scroll-padding-top: 50px;
  }
}

.sidebarTotals {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  padding-inline: 1em;
  padding-block: 0.5em;
  margin-block: -0.5em;
}

.stickyTotals {
  position: sticky;
  top: 0;
  background-color: var(--background-full);
  z-index: 1;
}
</style>
