<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed, ref } from 'vue';

import { useActivityStore } from '@/stores/ActivityStore';
import { type FilterModel } from '@/types/FilterModel';
import config from '@/utils/config';
import { formatFullDateTime, formatSplitDate } from '@/utils/numberFormat';

import SidebarItemLink from '../sidebar/SidebarItemLink.vue';
import SidebarItemStats from '../sidebar/SidebarItemStats.vue';
import StravaEmoji from '../strava-symbol/StravaEmoji.vue';
import StravaIcon from '../strava-symbol/StravaIcon.vue';

const activityStore = useActivityStore();

// This conditional must be in the component rather than the template, so that tree-shaking works
const StravaActivitySymbol = config.USE_STRAVA_ICONS ? StravaIcon : StravaEmoji;

const { item } = defineProps<{
  item: MapItem;
}>();

const nameElement = ref<HTMLElement>();

const clippedName = ref<string>();

// Read on hover rather than on render, so a list of thousands does not measure every row
function checkNameClipped() {
  const element = nameElement.value;
  if (!element) return;

  // Measured against itself unclamped: the trim leaves scrollHeight above clientHeight even when
  // every line fits, so the two cannot be compared directly
  const clamped = element.clientHeight;
  element.style.maxHeight = 'none';
  const full = element.clientHeight;
  element.style.maxHeight = '';

  clippedName.value = full > clamped ? item.name : undefined;
}

const startDate = computed(() => (!item.route && item.localDate) || item.date);

const dateString = computed(() => formatSplitDate(startDate.value));

const fullDate = computed(() => formatFullDateTime(startDate.value));

// Only show device if not a route and device is in the required attribution list
const device = computed(() => {
  if (item.route) {
    return undefined;
  } else if (activityStore.filterFields.has('device')) {
    return item.device;
  } else if (config.ATTRIBUTION.some((brand) => item.device?.startsWith(brand))) {
    return item.device;
  } else {
    return undefined;
  }
});

type TypedKeyOf<T extends object, V> = Exclude<
  {
    [K in keyof T]: T[K] extends V ? K : never;
  }[keyof T],
  undefined
>;

// Show an icon for boolean filter fields if the filter is enabled but not set
function booleanIcon<T extends MapItem>(
  item: T,
  key: TypedKeyOf<FilterModel, boolean | undefined> & keyof T,
  trueIcon: string | undefined,
  falseIcon: string | undefined,
): string | undefined {
  const iconNeeded =
    activityStore.filterFields.has(key) &&
    item[key] !== undefined &&
    activityStore.filterModel[key] === undefined;
  if (!iconNeeded) return undefined;
  return item[key] ? trueIcon : falseIcon;
}

const statsIcons = computed(() =>
  [
    !item.route && booleanIcon(item, 'isCommute', 'work', undefined),
    booleanIcon(item, 'isPrivate', 'lock', undefined),
  ].filter((icon): icon is string => !!icon),
);
</script>

<template>
  <div :class="[$style.mapItemRow, device && $style.hasDevice]">
    <div v-if="$slots.leading" :class="$style.leading">
      <slot name="leading" />
    </div>
    <StravaActivitySymbol :class="$style.stravaIcon" :sportType="item.type" />
    <div :class="$style.info">
      <div
        ref="nameElement"
        :class="$style.name"
        :title="clippedName"
        @pointerenter="checkNameClipped"
        v-text="item.name"
      />
      <div v-if="device" :class="$style.device" v-text="device" />
      <div :class="$style.stats">
        <SidebarItemStats :item :icons="statsIcons" />
      </div>
    </div>
    <div :class="$style.date" :title="fullDate" v-text="dateString.join('\n')" />
    <SidebarItemLink :item :class="$style.link" />
  </div>
</template>

<style module lang="scss">
@use '../../styles/typography' as typography;

.mapItemRow {
  container: map-item-row / inline-size;

  font-size: 14px;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto auto;
  grid-template-rows: auto min-content;
  grid-template-areas:
    'leading icon info  date link'
    'leading icon stack .    link';
  align-items: center;
  box-sizing: border-box;
  min-height: 36px;
  --row-block-padding: 2px;
  padding-block: var(--row-block-padding);

  .leading {
    grid-area: leading;
    display: flex;
    align-items: center;
  }

  .link {
    grid-area: link;
  }

  // margin instead of gap, so that empty areas take up no space
  > :not(:last-child) {
    margin-inline-end: 4px;
  }

  &.hasDevice {
    // Increase the height to accommodate the device information
    min-height: 49px;
  }

  .stravaIcon {
    grid-area: icon;
    margin-inline-end: 8px;
  }

  .name {
    @include typography.optical-centre($lines: 3);

    display: block;
    overflow-wrap: anywhere;
  }

  .device {
    @include typography.optical-centre;

    font-size: 0.75em;
    color: var(--color-mid);
  }

  .info {
    grid-area: info;
    display: flex;
    flex-direction: column;
  }

  .stats {
    display: flex;
  }

  .date {
    @include typography.optical-centre;

    grid-area: date;
    font-size: 0.75em;
    text-align: end;
    white-space: pre-line;
  }

  @container map-item-row (width < 15rem) {
    .date {
      grid-area: stack;
      text-align: start;
      white-space: normal;
    }
  }
}
</style>
