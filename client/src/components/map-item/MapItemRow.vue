<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import { useActivityStore } from '@/stores/ActivityStore';
import { type FilterModel } from '@/types/FilterModel';
import config from '@/utils/config';
import { formatFullDateTime, formatSplitDate } from '@/utils/numberFormat';

import SidebarItemLink from '../sidebar/SidebarItemLink.vue';
import SidebarItemStats from '../sidebar/SidebarItemStats.vue';
import StravaEmoji from '../strava-symbol/StravaEmoji.vue';
import StravaIcon from '../strava-symbol/StravaIcon.vue';
import UISpinner from '../ui/UISpinner.vue';

const activityStore = useActivityStore();

// This conditional must be in the component rather than the template, so that tree-shaking works
const StravaActivitySymbol = config.USE_STRAVA_ICONS ? StravaIcon : StravaEmoji;

const { item } = defineProps<{
  item: MapItem;
}>();

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
    <slot name="leading" />
    <StravaActivitySymbol :class="$style.stravaIcon" :sportType="item.type" />
    <div :class="$style.info">
      <div :class="$style.name" v-text="item.name" />
      <div v-if="device" :class="$style.device" v-text="device" />
      <div style="display: flex">
        <SidebarItemStats :item :icons="statsIcons" />
      </div>
    </div>
    <div v-if="!item.map" :class="$style.spinner">
      <UISpinner size="tiny" />
    </div>
    <div :class="$style.date" :title="fullDate" v-text="dateString.join('\n')" />
    <SidebarItemLink :item />
  </div>
</template>

<style module lang="scss">
@use '../../styles/typography' as typography;

.mapItemRow {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 0 4px;
  min-height: 36px;

  &.hasDevice {
    // Increase the height to accommodate the device information
    min-height: 49px;
  }

  .stravaIcon {
    margin-right: 4px;
  }

  .name {
    @include typography.optical-centre;

    overflow-wrap: anywhere;

    // Long enough for any real name; past that the row would run away with the list. Three trimmed
    // lines are 3lh less the (1lh - 1cap) the trim takes off the ends. -webkit-line-clamp would
    // bring an ellipsis, but only on a -webkit-box, which Safari will not trim; hidden would make a
    // scroll container, which Firefox will not trim.
    display: block;
    max-height: calc(2lh + 1cap);
    overflow: clip;
  }

  .device {
    @include typography.optical-centre;

    font-size: 0.75em;
    color: var(--color-mid);
  }

  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .spinner {
    margin: 0.5em;
  }

  .date {
    @include typography.optical-centre;

    font-size: 0.75em;
    text-align: end;
    white-space: pre-line;
  }
}
</style>
