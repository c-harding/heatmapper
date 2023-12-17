<script setup lang="ts">
import type { Activity, Route } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import Spinner from './Spinner.vue';

const props = withDefaults(
  defineProps<{
    activity: Activity | Route;
    selected?: boolean;
  }>(),
  {
    selected: false,
  },
);

const emit = defineEmits<{
  (e: 'click', value: MouseEvent): void;
  (e: 'touchstart'): void;
  (e: 'dblclick', value: MouseEvent): void;
}>();

const url = computed<string>(() => {
  if ((props.activity as Route).route) return `https://www.strava.com/routes/${props.activity.id}`;
  return `https://www.strava.com/activities/${props.activity.id}`;
});
</script>

<template>
  <li
    :class="['activity-item', { selected }]"
    @click="emit('click', $event)"
    @touchstart="emit('touchstart')"
    @dblclick="emit('dblclick', $event)"
  >
    <div class="activity-name" v-text="activity.name" />
    <div v-if="!activity.map" class="spinner">
      <Spinner size="tiny" line-fg-color="#888" />
    </div>
    <div class="date" v-text="activity.dateString.join('\n')" />
    <a :href="url" target="_blank" class="strava-link" @click="$event.stopPropagation()">
      <img src="@/assets/strava.png" />
    </a>
  </li>
</template>

<style lang="scss">
.activity-item {
  cursor: pointer;
  list-style: none;
  font-size: 14px;
  display: flex;
  align-items: center;

  &:hover {
    background: var(--background-slight);
  }

  &.selected {
    background: var(--background-strong);
  }

  > * {
    padding: 2px 0;
  }

  .activity-name {
    flex: 1;
    padding-left: 8px;
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
  }

  .date {
    display: inline-block;
    white-space: pre-line;
    font-size: 0.75em;
    text-align: right;
  }
}
</style>
