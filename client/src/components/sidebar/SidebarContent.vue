<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';

import { useActivityService } from '@/services/useActivityService';
import { combineStats } from '@/utils/stats';
import { cancelTextSelection } from '@/utils/ui';

import SidebarForm from './SidebarForm.vue';
import SidebarItemCount from './SidebarItemCount.vue';
import SidebarItemStats from './SidebarItemStats.vue';
import SidebarItem from './SidebarItem.vue';
import SidebarCredits from './SIdebarCredits.vue';

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
  zoomToSelected: [];
  focusSidebar: [];
  scrollToSelected: [];
}>();

const { mapItems } = useActivityService();

const totals = computed(() => combineStats(mapItems.value, selected.value));

let localSelected: readonly string[] | undefined;
let selectionBase: readonly string[] | undefined;

function toggleInArray<T>(array: readonly T[], item: T): T[] {
  if (array.includes(item)) return array.filter((x) => x !== item);
  else return [...array, item];
}

function getSelectedItems(id: string, e: MouseEvent): string[] {
  if (e.metaKey || e.ctrlKey) return toggleInArray(selected.value, id);
  if (e.shiftKey) return getRange(mapItems.value, id, selectionBase);
  return [id];
}

function click(id: string, e: MouseEvent): void {
  if (e.detail === 1) select(id, e);
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
  emit('zoomToSelected');
}

type VueElement = {
  $el: HTMLElement;
  $refs: Record<string, VueElement & HTMLElement>;
  sizes: { accumulator: number; size: number }[];
  scrollToPosition(pos: number): void;
  scrollToItem(index: number): void;
};
const scroller = ref<VueElement>();

watch(selected, async (selected) => {
  if (selected !== localSelected) {
    localSelected = selected;
    selectionBase = selected;
    if (selected.length === 0) return;
    emit('focusSidebar');
    await nextTick();
    const index = mapItems.value.findIndex((item) => item.id === selected[0]);

    if (!scroller.value || index < 0) return;

    const recycleScroller = scroller.value.$refs.scroller;
    const scrollContainer = scroller.value.$el;
    const scrollListOffset = recycleScroller.$refs.wrapper.offsetTop;
    const size = recycleScroller.sizes[index];
    if (size) {
      const minPos = size.accumulator - size.size + scrollListOffset;
      const maxPos = size.accumulator + scrollListOffset;
      if (
        minPos < scrollContainer.scrollTop ||
        maxPos > scrollContainer.scrollTop + scrollContainer.offsetHeight
      ) {
        recycleScroller.scrollToPosition((minPos + maxPos - scrollContainer.clientHeight) / 2);
      }
    } else {
      recycleScroller.scrollToItem(index);
    }
  }
});
</script>

<template>
  <DynamicScroller ref="scroller" :items="mapItems" :min-item-size="36" key-field="id">
    <template #before>
      <SidebarForm />
      <!-- TODO: make sticky -->
      <div
        v-if="mapItems?.length"
        :class="[$style.sidebarTotals, totals.showSelected && $style.stickyTotals]"
      >
        <SidebarItemCount :counts="totals" />
        <SidebarItemStats :item="totals" />
      </div>
    </template>
    <template #default="{ item, active }">
      <DynamicScrollerItem :item="item" :active="active" :size-dependencies="[item.name]">
        <SidebarItem
          :item="item"
          :selected="selected.includes(item.id)"
          @click="click(item.id, $event)"
          @dblclick="forceSelect"
        />
      </DynamicScrollerItem>
    </template>
    <template #after>
      <SidebarCredits />
    </template>
  </DynamicScroller>
</template>

<style lang="scss">
@import 'vue-virtual-scroller/dist/vue-virtual-scroller.css' layer(virtual-scroller);
</style>

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
