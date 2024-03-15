<script lang="ts">
// Set in vite.config.js
declare const USE_EMOJI: boolean | undefined;

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
import type { MapItem, SportType } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import Spinner from './Spinner.vue';
import StravaEmoji from './strava-symbol/StravaEmoji.vue';
import StravaIcon from './strava-symbol/StravaIcon.vue';

// This conditional must be in the component rather than the template, so that tree-shaking works
const StravaActivitySymbol = USE_EMOJI ? StravaEmoji : StravaIcon;

const props = withDefaults(
  defineProps<{
    item: MapItem;
    selected?: boolean;
    expanded?: boolean;
  }>(),
  {
    selected: false,
    expanded: true,
  },
);

const emit = defineEmits<{
  (e: 'click', value: MouseEvent): void;
  (e: 'touchstart'): void;
  (e: 'dblclick', value: MouseEvent): void;
}>();

const url = computed<string>(() => {
  if (props.item.route) {
    return `https://www.strava.com/routes/${props.item.id}`;
  } else {
    return `https://www.strava.com/activities/${props.item.id}`;
  }
});

const showElevationLoss: SportType[] = [
  // 'AlpineSki',
  // 'BackcountrySki',
  // 'Canoeing',
  // 'Kayaking'
];

const hideElevationGain: SportType[] = [
  // 'AlpineSki',
  'Crossfit',
  'Elliptical',
  'Handcycle',
  'IceSkate',
  'InlineSkate',
  'Kitesurf',
  'Rowing',
  'Sail',
  'Skateboard',
  'Soccer',
  'StandUpPaddling',
  'Surfing',
  'Swim',
  'WeightTraining',
  'Windsurf',
  'Yoga',
];

const useTextLink = USE_EMOJI;

const distanceString = computed(() => {
  const kilometers = props.item.distance / 1000;

  const format = kilometers >= 100 ? bigKilometerFormat : smallKilometerFormat;
  return format.format(kilometers);
});

const movingTime = computed(() => {
  const time = !props.item.route && props.item.movingTime;
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
  if (!props.item.elevation) return;
  const elevationGain =
    (props.item.route || !hideElevationGain.includes(props.item.type)) &&
    props.item.elevation.gain !== undefined &&
    `${ascentArrow} ${meterFormat.format(props.item.elevation.gain)}`;

  const elevationLoss =
    !props.item.route &&
    showElevationLoss.includes(props.item.type) &&
    props.item.elevation.loss !== undefined &&
    `${descentArrow} ${meterFormat.format(props.item.elevation.loss)}`;

  if (elevationGain && elevationLoss) {
    return `${elevationGain} ${elevationLoss}`;
  } else {
    return elevationGain ?? elevationLoss;
  }
});

const stats = computed(() =>
  [distanceString.value, elevationString.value, movingTime.value].filter(Boolean).join(' • '),
);

const startDate = computed(() => (!props.item.route && props.item.localDate) || props.item.date);

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
      <Spinner size="tiny" line-fg-color="#888" />
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
    background: var(--background-slight);
  }

  &.selected {
    background: var(--background-strong);
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
    padding: 0.5em;
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
      color: #fc4c02;
    }
  }

  .date {
    font-size: 0.75em;
    text-align: end;
    white-space: pre-line;
  }
}
</style>
