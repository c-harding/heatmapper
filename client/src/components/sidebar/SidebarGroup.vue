<script setup lang="ts">
import { computed, ref } from 'vue';

import { useExpandableGroup } from '@/services/useExpandableGroups';
import useStickyHeader from '@/services/useStickyHeader';
import { type MapItemGroup } from '@/stores/ActivityStore';
import { useSelectionStore } from '@/stores/SelectionStore';
import { cancelTextSelection } from '@/utils/ui';

import UIIcon from '../ui/UIIcon.vue';
import SidebarItemCount from './SidebarItemCount.vue';
import SidebarItemList from './SidebarItemList.vue';
import SidebarItemStats from './SidebarItemStats.vue';

const { group } = defineProps<{ group: MapItemGroup }>();

const selectionStore = useSelectionStore();

const emit = defineEmits<{
  zoomToSelected: [];
}>();

const isExpanded = useExpandableGroup();

const allSelected = computed(() =>
  group.items.every((item) => selectionStore.selected.has(item.id)),
);
const someSelected = computed(() =>
  group.items.some((item) => selectionStore.selected.has(item.id)),
);

const groupRef = ref<HTMLDivElement>();
const headerRef = ref<HTMLDivElement>();

const { heightPx: stickyHeaderHeightPx } = useStickyHeader();

function toggleExpanded() {
  if (isExpanded.value) {
    // When closing, scroll up if necessary so that the folded entry is still visible
    if (groupRef.value && headerRef.value && groupRef.value.offsetTop < headerRef.value.offsetTop) {
      groupRef.value?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }
  isExpanded.value = !isExpanded.value;
}

function forceSelect(): void {
  cancelTextSelection();
  emit('zoomToSelected');
}

function clickGroup(e: MouseEvent) {
  if (e.detail !== 1) return;

  if (e.shiftKey) cancelTextSelection();

  const ids = group.items.map((item) => item.id);

  selectionStore.select(ids, 'list', e.ctrlKey || e.metaKey, e.shiftKey);
}
</script>

<template>
  <div
    ref="groupRef"
    :class="[
      $style.sidebarGroup,
      allSelected && $style.allSelected,
      !allSelected && someSelected && $style.someSelected,
    ]"
  >
    <div
      ref="headerRef"
      :class="$style.sidebarGroupHeader"
      @click="clickGroup($event)"
      @dblclick="forceSelect()"
    >
      <a @click.stop.prevent="toggleExpanded" @dblclick.stop
        ><UIIcon icon="keyboard_arrow_right" :rotation="isExpanded ? 90 : 0"
      /></a>
      <div :class="$style.sideBarGroupInfo">
        <div :class="$style.sidebarGroupHeaderName" v-text="group.date" />
        <SidebarItemCount :counts="group.stats" />
        <SidebarItemStats :item="group.stats" />
      </div>
    </div>
    <Transition>
      <div v-if="isExpanded" :class="$style.sidebarGroupItems">
        <SidebarItemList :items="group.items" @zoom-to-selected="emit('zoomToSelected')" />
      </div>
    </Transition>
  </div>
</template>

<style module lang="scss">
.sidebarGroup {
  &:has(> :where(.sidebarGroupHeader:hover)) {
    &,
    & > .sidebarGroupHeader {
      background-color: var(--background-strong);
    }
  }

  &.someSelected > .sidebarGroupHeader {
    background-color: var(--background-strong);
  }

  &.allSelected > .sidebarGroupHeader {
    background-color: var(--background-weak);
  }
}

.sidebarGroupHeader {
  position: sticky;
  cursor: pointer;
  top: calc(v-bind('stickyHeaderHeightPx') - var(--group-height));
  height: var(--group-height);
  bottom: 36px;
  background-color: var(--background-full);
  z-index: 1;

  display: flex;
  min-height: 36px;
  align-items: center;

  > .sidebarGroupInfo {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}

.sidebarGroup:not(:first-child) {
  margin-top: 1em;
}

.sidebarGroupItems {
  display: grid;
  grid-template-rows: 1fr;

  > * {
    overflow: hidden;
  }

  &:global(.v-enter-active),
  &:global(.v-leave-active) {
    transition:
      grid-template-rows 500ms,
      max-height 500ms;
  }

  &:global(.v-enter-active) {
    transition-timing-function: ease-in-out;
  }
  &:global(.v-leave-active) {
    transition-timing-function: ease-in-out;
  }
  &:global(.v-enter-from),
  &:global(.v-leave-to) {
    grid-template-rows: 0fr;
    max-height: 0;
  }
  &:global(.v-enter-to),
  &:global(.v-leave-from) {
    grid-template-rows: 1fr;
    max-height: 100vh;
  }
}
</style>
