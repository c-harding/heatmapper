<script setup lang="ts">
import type { MapItem, SportType } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import Spinner from './Spinner.vue';
import StravaIcon from './StravaIcon.vue';

const props = withDefaults(
  defineProps<{
    item: MapItem;
    selected?: boolean;
    expanded?: boolean;
    showTime?: boolean;
  }>(),
  {
    selected: false,
    expanded: true,
    showTime: false,
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

const time = computed(() =>
  new Date(props.item.date).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: 'numeric',
  }),
);

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

const metres = (value: number, prefix = '') => `${prefix}${value.toFixed(0)}\xa0m`;
const suffix = (value: number | undefined, suffix: string, fixed = 0) =>
  value !== undefined ? value.toFixed(fixed) + suffix : undefined;

const distanceString = computed(() => {
  const kilometres = props.item.distance / 1000;
  const precision = 2 - Math.max(0, Math.min(Math.floor(Math.log10(kilometres)), 2));

  return suffix(kilometres, '\xa0km', precision);
});

const movingTime = computed(() => {
  const time = !props.item.route && props.item.movingTime;
  if (!time) return undefined;

  // If any value is zero,
  // return undefined if the previous value was undefined,
  // otherwise return zero (with the suffix).
  const days = suffix(Math.floor(time / 60 / 60 / 24) || undefined, 'd');
  const hours = suffix(Math.floor((time / 60 / 60) % 24) || (days ? 0 : undefined), 'h');
  const minutes = suffix(Math.floor((time / 60) % 60) || (hours ? 0 : undefined), 'm');
  const seconds = suffix(Math.floor(time % 60) || (minutes ? 0 : undefined), 's');

  return (
    [days, hours, minutes, seconds]
      // Ignore zero entries
      .filter(Boolean)
      // Take the most significant digits
      .slice(0, 2)
      // join with non-breaking spaces
      .join('\xa0')
  );
});

const elevationString = computed(() => {
  if (!props.item.elevation) return;
  const elevationGain =
    props.item.route || !hideElevationGain.includes(props.item.type)
      ? metres(props.item.elevation.gain, '↗\xa0')
      : undefined;
  const elevationLoss =
    !props.item.route && showElevationLoss.includes(props.item.type)
      ? metres(props.item.elevation.loss, '↘\xa0')
      : undefined;

  if (elevationGain && elevationLoss) {
    return `${elevationGain} ${elevationLoss}`;
  } else {
    return elevationGain ?? elevationLoss;
  }
});

const stats = computed(() =>
  [distanceString.value, elevationString.value, movingTime.value].filter(Boolean).join(' • '),
);
</script>

<template>
  <li
    :class="['sidebar-item', { selected }]"
    @click="emit('click', $event)"
    @touchstart="emit('touchstart')"
    @dblclick="emit('dblclick', $event)"
  >
    <StravaIcon v-if="expanded" class="strava-icon" :sport-type="item.type" />
    <div class="sidebar-item-info">
      <div class="sidebar-item-name" v-text="item.name" />
      <div v-if="expanded" class="sidebar-item-stats" v-text="stats" />
    </div>
    <div v-if="!item.map" class="spinner">
      <Spinner size="tiny" line-fg-color="#888" />
    </div>
    <div class="date">
      <div v-text="item.dateString.join('\n')" />
      <div v-if="showTime && expanded && !item.route" class="time" v-text="time" />
    </div>
    <a
      :href="url"
      target="_blank"
      class="strava-link"
      :class="{ padding: !showTime }"
      @click="$event.stopPropagation()"
    >
      <img src="@/assets/strava.png" />
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

  &:hover {
    background: var(--background-slight);
  }

  &.selected {
    background: var(--background-strong);
  }

  .strava-icon {
    padding-right: 4px;
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

    &:not(:hover) > img {
      filter: grayscale(100%);
    }

    &.padding {
      padding-top: 8px;
      padding-bottom: 8px;
    }
  }

  .date {
    display: flex;
    font-size: 0.75em;
    flex-direction: column;
    align-items: center;
    text-align: center;
    white-space: pre-line;

    .time {
      opacity: 0.5;
    }
  }
}
</style>
