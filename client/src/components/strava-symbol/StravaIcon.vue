<script setup lang="ts">
import { sportTypes } from '@strava-heatmapper/shared/interfaces';

import { sportIconString } from '@/utils/icons';

import type StravaSymbolProps from './StravaSymbolProps';

const { sportType } = defineProps<StravaSymbolProps>();
</script>

<template>
  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
    <title v-text="sportTypes[sportType]" />
    <path fillRule="evenodd" :d="sportIconString(sportType)" />
  </svg>
</template>
