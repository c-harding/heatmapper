<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed, nextTick, reactive, ref, watch } from 'vue';

import { useActivityService } from '@/services/useActivityService';
import { provideExpandableGroups } from '@/services/useExpandableGroups';
import useStickyHeader from '@/services/useStickyHeader';
import { combineStats } from '@/utils/stats';
import { cancelTextSelection } from '@/utils/ui';

import UIIcon from '../ui/UIIcon.vue';
import SidebarCredits from './SidebarCredits.vue';
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

const expandableGroups = provideExpandableGroups();
const areSomeExpanded = expandableGroups.areSomeExpanded;

const totals = computed(() => combineStats(mapItems.value, selected.value));

let localSelected: readonly string[] | undefined;
let selectionBase: readonly string[] | undefined;

const sidebarItemListRef = ref<HTMLElement>();

const statsHeight = 50;
const groupHeight = 50;

useStickyHeader(computed(() => statsHeight + (groupLevel ? groupHeight : 0)));

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
      :class="[$style.sidebarTotalsContainer, totals.showSelected && $style.stickyTotals]"
    >
      <a
        v-if="expandableGroups.hasGroups.value"
        :class="$style.controlIconButton"
        @click.stop.prevent="
          expandableGroups.setAllExpanded(!expandableGroups.areSomeExpanded.value)
        "
        ><UIIcon icon="keyboard_double_arrow_right" :rotation="areSomeExpanded ? 90 : 0"
      /></a>
      <div :class="$style.sidebarTotals">
        <SidebarItemCount :counts="totals" />
        <SidebarItemStats :item="totals" />
      </div>
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

  --group-height: calc(v-bind(groupHeight) * 1px);
}

.sidebarTotalsContainer {
  display: flex;
  flex-direction: row;
  padding-inline: 1em;
  height: calc(v-bind(statsHeight) * 1px);
  margin-block: -1em;
  top: 0;
  background-color: var(--background-full);
  z-index: 2;

  &.stickyTotals,
  // sticky header is permanently enabled due to an issue with useStickyHeader
  &:not(.stickyTotals) {
    position: sticky;
  }
}

.sidebarTotals {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25em;
}

.controlIconButton {
  margin-block: auto;
  margin-left: -1em;
}
</style>
