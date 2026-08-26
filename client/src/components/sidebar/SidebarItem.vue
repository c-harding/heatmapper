<script lang="ts">
export const SELECTED_SIDEBAR_ITEM_SELECTOR = 'sidebar-item-selected';
</script>

<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';

import MapItemRow from '../map-item/MapItemRow.vue';
import UIIcon from '../ui/UIIcon.vue';

const {
  item,
  selected = false,
  showCheckbox = false,
} = defineProps<{
  item: MapItem;
  selected?: boolean;
  showCheckbox?: boolean;
}>();

const emit = defineEmits<{
  click: [value: MouseEvent];
  touchstart: [];
  dblclick: [value: MouseEvent];
}>();
</script>

<template>
  <MapItemRow
    :item
    :class="[
      $style.sidebarItem,
      selected && SELECTED_SIDEBAR_ITEM_SELECTOR,
      selected && $style.selected,
    ]"
    @click="emit('click', $event)"
    @touchstart="emit('touchstart')"
    @dblclick="emit('dblclick', $event)"
  >
    <template v-if="showCheckbox" #leading>
      <UIIcon
        :class="$style.checkbox"
        :icon="selected ? 'check_circle_outline' : 'radio_button_unchecked'"
        inline
        large
      />
    </template>
  </MapItemRow>
</template>

<style module lang="scss">
.sidebarItem {
  cursor: pointer;
  padding-inline-start: 8px;

  &:hover {
    background: var(--background-strong);
  }

  &:has(.checkbox) {
    padding-inline-start: 0;
  }

  .checkbox {
    margin-inline: 4px;
  }

  &.selected {
    background: var(--background-weak);
  }

  &.selected:hover {
    background: var(--background-mid);
  }
}
</style>
