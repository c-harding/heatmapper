<script lang="ts">
const locales = [navigator.language, ...navigator.languages];

const fullDateFormat = new Intl.DateTimeFormat(locales, {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});
const yearFormat = new Intl.DateTimeFormat(locales, { timeZone: 'UTC', year: 'numeric' });
const dateFormat = new Intl.DateTimeFormat(locales, {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});

const parts = fullDateFormat.formatToParts(0);
const yearFirst =
  parts.findIndex((part) => part.type === 'year') <
  parts.findIndex((part) => part.type === 'month');

const smallKilometerFormat = new Intl.NumberFormat(locales, {
  style: 'unit',
  unit: 'kilometer',
  maximumSignificantDigits: 3,
});
const bigKilometerFormat = new Intl.NumberFormat(locales, {
  style: 'unit',
  unit: 'kilometer',
  maximumFractionDigits: 0,
});
const meterFormat = new Intl.NumberFormat(locales, {
  style: 'unit',
  unit: 'meter',
  maximumFractionDigits: 0,
});

const [ascentArrow, descentArrow] = document.dir === 'rtl' ? ['↖', '↙'] : ['↗', '↘'];
</script>

<script setup lang="ts">
import { type MapItem, SportType } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import config from '@/utils/config';

import StravaEmoji from '../strava-symbol/StravaEmoji.vue';
import StravaIcon from '../strava-symbol/StravaIcon.vue';
import UISpinner from '../ui/UISpinner.vue';

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

const showElevationLoss: SportType[] = [
  // SportType.AlpineSki,
  // SportType.BackcountrySki,
  // SportType.Canoeing,
  // SportType.Kayaking,
];

const hideElevationGain: SportType[] = [
  // SportType.AlpineSki,
  SportType.Crossfit,
  SportType.Elliptical,
  SportType.Handcycle,
  SportType.IceSkate,
  SportType.InlineSkate,
  SportType.Kitesurf,
  SportType.Rowing,
  SportType.Sail,
  SportType.Skateboard,
  SportType.Soccer,
  SportType.StandUpPaddling,
  SportType.Surfing,
  SportType.Swim,
  SportType.WeightTraining,
  SportType.Windsurf,
  SportType.Yoga,
];

const useTextLink = !config.USE_STRAVA_ICONS;

const distanceString = computed(() => {
  const kilometers = item.distance / 1000;

  const format = kilometers >= 100 ? bigKilometerFormat : smallKilometerFormat;
  return format.format(kilometers);
});

const movingTime = computed(() => {
  const time = !item.route && item.movingTime;
  if (!time) return undefined;

  // If any value is zero,
  // return undefined if the previous value was undefined,
  // otherwise return zero (with the suffix).
  const timeParts = {
    day: Math.floor(time / 60 / 60 / 24),
    hour: Math.floor((time / 60 / 60) % 24),
    minute: Math.floor((time / 60) % 60),
    second: Math.floor(time % 60),
  };

  const timePartPairs = Array.from(Object.entries(timeParts));
  const firstValueIndex = timePartPairs.findIndex(([unit, value]) => value);

  return (
    timePartPairs
      .slice(firstValueIndex, firstValueIndex + 2)
      .map(([unit, value]) =>
        value.toLocaleString(locales, { style: 'unit', unitDisplay: 'narrow', unit }),
      )
      // join with non-breaking spaces
      .join('\xa0')
  );
});

const elevationString = computed(() => {
  if (!item.elevation) return;
  const elevationGain =
    (item.route || !hideElevationGain.includes(item.type)) &&
    item.elevation.gain !== undefined &&
    `${ascentArrow} ${meterFormat.format(item.elevation.gain)}`;

  const elevationLoss =
    !item.route &&
    showElevationLoss.includes(item.type) &&
    item.elevation.loss !== undefined &&
    `${descentArrow} ${meterFormat.format(item.elevation.loss)}`;

  if (elevationGain && elevationLoss) {
    return `${elevationGain} ${elevationLoss}`;
  } else {
    return elevationGain ?? elevationLoss;
  }
});

const stats = computed(() =>
  [distanceString.value, elevationString.value, movingTime.value].filter(Boolean).join(' • '),
);

const startDate = computed(() => (!item.route && item.localDate) || item.date);

const dateString = computed(() => {
  const yearString = yearFormat.format(startDate.value);
  const dayString = dateFormat.format(startDate.value);
  return yearFirst ? [yearString, dayString] : [dayString, yearString];
});

const fullDate = computed(() => fullDateFormat.format(startDate.value));
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
      <div v-if="expanded" class="sidebar-item-stats" v-text="stats" />
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
        <div>Strava</div></template
      >
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

  .sidebar-item-stats {
    font-size: 0.75em;
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
