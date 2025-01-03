<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import config from '@/utils/config';

import StravaEmoji from '../strava-symbol/StravaEmoji.vue';
import StravaIcon from '../strava-symbol/StravaIcon.vue';
import UISpinner from '../ui/UISpinner.vue';
import SidebarItemStats from './SidebarItemStats.vue';
import { formatFullDateTime, formatSplitDate } from '@/utils/numberFormat';

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

const url = computed<string>(() => {
  if (item.route) {
    return `https://www.strava.com/routes/${item.id}`;
  } else {
    return `https://www.strava.com/activities/${item.id}`;
  }
});

const useTextLink = !config.USE_STRAVA_ICONS;

const startDate = computed(() => (!item.route && item.localDate) || item.date);

const dateString = computed(() => formatSplitDate(startDate.value));

const fullDate = computed(() => formatFullDateTime(startDate.value));
</script>

<template>
  <li
    :class="['sidebar-item', { selected }]"
    @click="emit('click', $event)"
    @touchstart="emit('touchstart')"
    @dblclick="emit('dblclick', $event)"
  >
    <StravaActivitySymbol v-if="expanded" class="strava-icon" :sport-type="item.type" />
    <div class="sidebar-item-info">
      <div class="sidebar-item-name" v-text="item.name" />
      <SidebarItemStats v-if="expanded" :item="item" />
    </div>
    <div v-if="!item.map" class="spinner">
      <UISpinner size="tiny" />
    </div>
    <div class="date" :title="fullDate" v-text="dateString.join('\n')" />
    <a
      :href="url"
      target="_blank"
      title="View in Strava"
      class="strava-link"
      :class="{ 'text-link': useTextLink }"
      @click="$event.stopPropagation()"
    >
      <template v-if="useTextLink">
        <div>View on</div>
        <div>Strava</div>
      </template>
      <img v-else src="@/assets/strava.png" />
    </a>
  </li>
</template>

<style lang="scss">
.sidebar-item {
  cursor: pointer;
  list-style: none;
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

  .strava-icon {
    margin-right: 4px;
  }

  .sidebar-item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .spinner {
    margin: 0.5em;
  }

  .strava-link {
    $size: 1.5em;
    align-self: stretch;
    width: $size;
    display: flex;
    overflow: hidden;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    padding-right: 8px;

    > img {
      flex: 0 0 $size;
      height: $size;
    }

    &:not(:hover) {
      filter: grayscale(100%);
    }

    &.text-link {
      text-align: center;
      width: auto;
      font-size: 0.6rem;
      color: var(--bold-color);
    }
  }

  .date {
    font-size: 0.75em;
    text-align: end;
    white-space: pre-line;
  }
}
</style>
