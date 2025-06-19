<script lang="ts">
export const SELECTED_SIDEBAR_ITEM_SELECTOR = 'sidebar-item-selected';
</script>

<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import config from '@/utils/config';
import { formatFullDateTime, formatSplitDate } from '@/utils/numberFormat';

import StravaEmoji from '../strava-symbol/StravaEmoji.vue';
import StravaIcon from '../strava-symbol/StravaIcon.vue';
import UISpinner from '../ui/UISpinner.vue';
import SidebarItemLink from './SidebarItemLink.vue';
import SidebarItemStats from './SidebarItemStats.vue';

// This conditional must be in the component rather than the template, so that tree-shaking works
const StravaActivitySymbol = config.USE_STRAVA_ICONS ? StravaIcon : StravaEmoji;

const {
  item,
  selected = false,
  expanded = true,
} = defineProps<{
  item: MapItem;
  selected?: boolean;
  expanded?: boolean;
}>();

const emit = defineEmits<{
  click: [value: MouseEvent];
  touchstart: [];
  dblclick: [value: MouseEvent];
}>();

const startDate = computed(() => (!item.route && item.localDate) || item.date);

const dateString = computed(() => formatSplitDate(startDate.value));

const fullDate = computed(() => formatFullDateTime(startDate.value));
</script>

<template>
  <div
    :class="[
      $style.sidebarItem,
      selected && SELECTED_SIDEBAR_ITEM_SELECTOR,
      selected && $style.selected,
    ]"
    @click="emit('click', $event)"
    @touchstart="emit('touchstart')"
    @dblclick="emit('dblclick', $event)"
  >
    <StravaActivitySymbol v-if="expanded" :class="$style.stravaIcon" :sportType="item.type" />
    <div :class="$style.sidebarItemInfo">
      <div :class="$style.sidebarItemName" v-text="item.name" />
      <SidebarItemStats v-if="expanded" :item />
    </div>
    <div v-if="!item.map" :class="$style.spinner">
      <UISpinner size="tiny" />
    </div>
    <div :class="$style.date" :title="fullDate" v-text="dateString.join('\n')" />
    <SidebarItemLink :class="$style.stravaLink" :item />
  </div>
</template>

<style module lang="scss">
.sidebarItem {
  cursor: pointer;
  font-size: 14px;
  padding-left: 8px;
  display: flex;
  align-items: center;
  gap: 0 4px;
  min-height: 36px;

  &:hover {
    background: var(--background-strong);
  }

  &.selected {
    background: var(--background-weak);
  }

  &.selected:hover {
    background: var(--background-mid);
  }

  .stravaIcon {
    margin-right: 4px;
  }

  .sidebarItemName {
    overflow-wrap: anywhere;
  }

  .sidebarItemInfo {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .spinner {
    margin: 0.5em;
  }

  .date {
    font-size: 0.75em;
    text-align: end;
    white-space: pre-line;
  }
}
</style>
