<script setup lang="ts">
import { computed, ref } from 'vue';

import { useExpandableGroup } from '@/services/useExpandableGroups';
import { type MapItemGroup } from '@/stores/ActivityStore';

import UIIcon from '../ui/UIIcon.vue';
import SidebarItemCount from './SidebarItemCount.vue';
import SidebarItemList from './SidebarItemList.vue';
import SidebarItemStats from './SidebarItemStats.vue';

const { group } = defineProps<{ group: MapItemGroup }>();

const emit = defineEmits<{
  zoomToSelected: [];
}>();

const isExpanded = useExpandableGroup();

const arrow = computed(() => (isExpanded.value ? 'keyboard_arrow_down' : 'keyboard_arrow_right'));

const groupRef = ref<HTMLDivElement>();
const headerRef = ref<HTMLDivElement>();

function toggleExpanded() {
  if (isExpanded.value) {
    // When closing, scroll up if necessary so that the folded entry is still visible
    if (groupRef.value && headerRef.value && groupRef.value.offsetTop < headerRef.value.offsetTop) {
      groupRef.value?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }
  isExpanded.value = !isExpanded.value;
}
</script>

<template>
  <div ref="groupRef" :class="$style.sidebarGroup">
    <div ref="headerRef" :class="$style.sidebarGroupHeader">
      <a @click.stop.prevent="toggleExpanded"><UIIcon :icon="arrow" /></a>
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
.sidebarGroupHeader {
  position: sticky;
  top: 0;
  bottom: 36px;
  backdrop-filter: blur(1em);
  background-color: color-mix(in srgb, var(--background-pure) 20%, transparent);

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
