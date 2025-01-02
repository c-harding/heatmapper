<script setup lang="ts">
import SidebarItemStats from './SidebarItemStats.vue';
import SidebarItemList from './SidebarItemList.vue';
import { MapItemGroup } from '@/services/ActivityService';
import { computed, ref } from 'vue';
import UIIcon from '../ui/UIIcon.vue';
import { useExpandableGroup } from '@/services/useExpandableGroups';

const { group } = defineProps<{ group: MapItemGroup }>();

const selected = defineModel<readonly string[]>('selected', { required: true });

const emit = defineEmits<{
  select: [item: string, e: MouseEvent];
  'force-select': [];
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
  <div ref="groupRef" class="sidebar-group">
    <div ref="headerRef" class="sidebar-group-header">
      <a @click.stop.prevent="toggleExpanded"><UIIcon :icon="arrow" /></a>
      <div class="side-bar-group-info">
        <div class="sidebar-group-header-name" v-text="group.date" />
        <SidebarItemStats :item="group.stats" />
      </div>
    </div>
    <Transition>
      <div v-if="isExpanded" class="sidebar-group-items">
        <SidebarItemList
          v-model:selected="selected"
          :items="group.items"
          @select="(item, e) => emit('select', item, e)"
          @force-select="emit('force-select')"
        />
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.sidebar-group-header {
  position: sticky;
  top: 0;
  bottom: 36px;
  backdrop-filter: blur(1em);
  background-color: color-mix(in srgb, var(--background-pure) 20%, transparent);

  display: flex;
  min-height: 36px;
  align-items: center;

  > .sidebar-group-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}

.sidebar-group:not(:first-child) {
  margin-top: 1em;
}

.sidebar-group-items {
  display: grid;
  grid-template-rows: 1fr;

  > * {
    overflow: hidden;
  }

  &.v-enter-active,
  &.v-leave-active {
    transition:
      grid-template-rows 500ms,
      max-height 500ms;
  }

  &.v-enter-active {
    transition-timing-function: ease-in-out;
  }
  &.v-leave-active {
    transition-timing-function: ease-in-out;
  }
  &.v-enter-from,
  &.v-leave-to {
    grid-template-rows: 0fr;
    max-height: 0;
  }
  &.v-enter-to,
  &.v-leave-from {
    grid-template-rows: 1fr;
    max-height: 100vh;
  }
}
</style>
