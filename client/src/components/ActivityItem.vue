<script setup lang="ts">
import type { Activity, Route } from '@strava-heatmapper/shared/interfaces';
import type { SportType } from '@strava-heatmapper/shared/interfaces/SportType';
import { computed } from 'vue';

import Spinner from './Spinner.vue';
import StravaIcon from './StravaIcon.vue';

const props = withDefaults(
  defineProps<{
    activity: Activity | Route;
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
  if (props.activity.route) {
    return `https://www.strava.com/routes/${props.activity.id}`;
  } else {
    return `https://www.strava.com/activities/${props.activity.id}`;
  }
});

const time = computed(() =>
  new Date(props.activity.date).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: 'numeric',
  }),
);

const showElevationGain: SportType[] = ['AlpineSki', 'BackcountrySki', 'Canoeing', 'Kayaking'];

const hideElevationGain: SportType[] = [
  'AlpineSki',
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

const pad = (num: number) => num.toFixed(0).padStart(2, '0');
const metres = (value: number, prefix = '') => `${prefix}${value.toFixed(0)}\xa0m`;
const suffix = (value: number | undefined, suffix: string, fixed = 0) =>
  value !== undefined ? value.toFixed(fixed) + suffix : undefined;

const distanceString = computed(() => {
  const kilometres = props.activity.distance / 1000;
  const precision = 2 - Math.max(0, Math.min(Math.floor(Math.log10(kilometres)), 2));

  return suffix(kilometres, '\xa0km', precision);
});

const movingTime = computed(() => {
  const time = !props.activity.route && props.activity.movingTime;
  if (!time) return undefined;
  const days = suffix(Math.floor(time / 60 / 60 / 24) || undefined, '\xa0d');
  const hours = suffix(Math.floor((time / 60 / 60) % 24) || undefined, '\xa0h');
  const minutes = suffix(Math.floor((time / 60) % 60) || undefined, '\xa0m');
  const seconds = suffix(Math.floor(time % 60) || undefined, '\xa0s');

  return [days, hours, minutes, seconds].filter(Boolean).slice(0, 2).join(' ');
});

const elevationString = computed(() => {
  if (!props.activity.elevation) return;
  const elevationGain =
    props.activity.route || !hideElevationGain.includes(props.activity.type)
      ? metres(props.activity.elevation.gain, '↗\xa0')
      : undefined;
  const elevationLoss =
    !props.activity.route && showElevationGain.includes(props.activity.type)
      ? metres(props.activity.elevation.loss, '↘\xa0')
      : undefined;

  if (elevationGain && elevationLoss) {
    return `+${elevationGain} ${elevationLoss}`;
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
    :class="['activity-item', { selected }]"
    @click="emit('click', $event)"
    @touchstart="emit('touchstart')"
    @dblclick="emit('dblclick', $event)"
  >
    <StravaIcon v-if="expanded" class="strava-icon" :sport-type="activity.type" />
    <div class="activity-info">
      <div class="activity-name" v-text="activity.name" />
      <div v-if="expanded" class="activity-stats" v-text="stats" />
    </div>
    <div v-if="!activity.map" class="spinner">
      <Spinner size="tiny" line-fg-color="#888" />
    </div>
    <div class="date">
      <div v-text="activity.dateString.join('\n')" />
      <div v-if="showTime && expanded && !activity.route" class="time" v-text="time" />
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
.activity-item {
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

  .activity-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .activity-stats {
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
