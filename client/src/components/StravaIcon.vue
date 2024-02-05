<script setup lang="ts">
import type { SportType } from '@strava-heatmapper/shared/interfaces';

import { sportTypes } from '../sportTypes';
import { sportIconString } from '../utils/icons';

const props = withDefaults(
  defineProps<{
    sportType: SportType;
  }>(),
  {},
);
</script>

<template>
  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
    <title v-text="sportTypes[sportType]" />
    <path fillRule="evenodd" :d="sportIconString(sportType)" />
  </svg>
</template>

<style lang="scss">
.material-icons {
  user-select: none;
  width: 1em;
  &.inline {
    vertical-align: middle;
    align-self: center;
    font-size: 1em;
  }
  &.large {
    font-size: 1.5em;
  }
  &.placeholder {
    visibility: hidden;
  }
  &.bottom {
    vertical-align: bottom;
  }
}
</style>
