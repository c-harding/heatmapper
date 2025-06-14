<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { provideExpandableGroups } from '@/services/useExpandableGroups';
import useStickyHeader from '@/services/useStickyHeader';
import { useActivityStore } from '@/stores/ActivityStore';
import { useSelectionStore } from '@/stores/SelectionStore';
import { combineStats } from '@/utils/stats';

import SidebarCredits from './SidebarCredits.vue';
import SidebarForm from './SidebarForm.vue';
import SidebarGroup from './SidebarGroup.vue';
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

provideExpandableGroups();

const totals = computed(() => combineStats(activityStore.mapItems, selectionStore.selectedItems));

const sidebarItemListRef = ref<HTMLElement>();

const statsHeight = 50;
const groupHeight = 50;

useStickyHeader(computed(() => statsHeight + (activityStore.groupLevel ? groupHeight : 0)));

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
      <template v-if="activityStore.groupLevel">
        <SidebarGroup
          v-for="group of activityStore.groupedMapItems"
          :key="group.date"
          :group
          @zoom-to-selected="emit('zoomToSelected')"
        />
      </template>
      <SidebarItemList
        v-else
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

  --group-height: calc(v-bind(groupHeight) * 1px);
}

.sidebarTotals {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25em;
  padding-inline: 1em;
  height: calc(v-bind(statsHeight) * 1px);
  margin-block: -1em;
  position: sticky;
  top: 0;
  background-color: var(--background-full);
  z-index: 2;
}
</style>
