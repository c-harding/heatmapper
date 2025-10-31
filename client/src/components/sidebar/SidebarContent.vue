<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { useActivityStore } from '@/stores/ActivityStore';
import { useSelectionStore } from '@/stores/SelectionStore';
import { combineStats } from '@/utils/stats';

import SidebarCredits from './SidebarCredits.vue';
import SidebarForm from './SidebarForm.vue';
import SidebarItemCount from './SidebarItemCount.vue';
import SidebarItemList from './SidebarItemList.vue';
import SidebarItemStats from './SidebarItemStats.vue';

const emit = defineEmits<{
  zoomToSelected: [];
  focusSidebar: [];
  scrollToSelected: [];
}>();

const activityStore = useActivityStore();
const selectionStore = useSelectionStore();

const totals = computed(() => combineStats(activityStore.mapItems, selectionStore.selectedItems));

const sidebarItemListRef = ref<HTMLElement>();

watch(
  () => selectionStore.selected,
  async (selected) => {
    if (selectionStore.updateSource === 'map') {
      if (selected.size !== 0) emit('focusSidebar');
      await nextTick();
      emit('scrollToSelected');
    }
  },
);
</script>

<template>
  <div :class="$style.sidebarContent">
    <SidebarForm />
    <div
      v-if="activityStore.mapItems?.length"
      :class="[$style.sidebarTotals, totals.showSelected && $style.stickyTotals]"
    >
      <SidebarItemCount :counts="totals" />
      <SidebarItemStats :item="totals" />
    </div>
    <div ref="sidebarItemListRef">
      <SidebarItemList
        :items="activityStore.mapItems"
        @zoom-to-selected="emit('zoomToSelected')"
        @scroll-to-selected="emit('scrollToSelected')"
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
