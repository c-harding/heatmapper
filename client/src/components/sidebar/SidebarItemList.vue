<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';

import SidebarItem from './SidebarItem.vue';

defineProps<{ items: readonly MapItem[] }>();

const selected = defineModel<string[]>('selected', { required: true });

const emit = defineEmits<{
  select: [item: string, e: MouseEvent];
  'force-select': [];
}>();

function click(id: string, e: MouseEvent): void {
  if (e.detail === 1) emit('select', id, e);
}
</script>

<template>
  <ul>
    <SidebarItem
      v-for="item of items"
      :key="item.id"
      :item="item"
      :selected="selected.includes(item.id)"
      @click="click(item.id, $event)"
      @dblclick="emit('force-select')"
    />
  </ul>
</template>

<style lang="scss" scoped>
ul {
  padding: 0;
  margin: 0;
}
</style>
