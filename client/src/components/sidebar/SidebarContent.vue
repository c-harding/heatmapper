<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { provideExpandableGroups } from '@/services/useExpandableGroups';
import useStickyHeader from '@/services/useStickyHeader';
import { useActivityStore } from '@/stores/ActivityStore';
import { useSelectionStore } from '@/stores/SelectionStore';
import { combineStats } from '@/utils/stats';

import UIIcon from '../ui/UIIcon.vue';
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

const expandableGroups = provideExpandableGroups();
const areSomeExpanded = expandableGroups.areSomeExpanded;

const totals = computed(() => combineStats(activityStore.mapItems, selectionStore.selectedItems));

const sidebarItemListRef = ref<HTMLElement>();

const statsHeight = 50;
const groupHeight = 50;

useStickyHeader(computed(() => statsHeight + (activityStore.groupLevel ? groupHeight : 0)));

watch(selectionStore.selected, async (selected) => {
  if (selectionStore.updateSource === 'map') {
    if (selected.size !== 0) emit('focusSidebar');
    await nextTick();
    emit('scrollToSelected');
  }
});
</script>

<template>
  <div :class="$style.sidebarContent">
    <SidebarForm />
    <div
      v-if="activityStore.mapItems?.length"
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

.sidebarTotalsContainer {
  display: flex;
  flex-direction: row;
  padding-inline: 1em;
  height: calc(v-bind(statsHeight) * 1px);
  margin-block: -1em;
  top: 0;
  background-color: var(--background-full);
  z-index: 2;
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
