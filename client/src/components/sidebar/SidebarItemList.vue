<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';

import { useSelectionStore } from '@/stores/SelectionStore';
import { cancelTextSelection } from '@/utils/ui';

import SidebarItem from './SidebarItem.vue';

defineProps<{ items: readonly MapItem[] }>();

const selectionStore = useSelectionStore();

const emit = defineEmits<{
  zoomToSelected: [];
  focusSidebar: [];
  scrollToSelected: [];
}>();

function forceSelect(): void {
  cancelTextSelection();
  emit('zoomToSelected');
}

function click(id: string, e: MouseEvent): void {
  if (e.detail !== 1) return;

  if (e.shiftKey) cancelTextSelection();

  selectionStore.select(id, 'list', e.ctrlKey || e.metaKey, e.shiftKey);
}
</script>

<template>
  <div class="sidebar-item-list">
    <SidebarItem
      v-for="item of items"
      :key="item.id"
      :item
      :selected="selectionStore.selected.has(item.id)"
      :showCheckbox="selectionStore.multiSelectionMode"
      @click="click(item.id, $event)"
      @dblclick="forceSelect()"
    />
  </div>
</template>
