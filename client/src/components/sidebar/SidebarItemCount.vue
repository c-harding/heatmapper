<script setup lang="ts">
import { type CombinedMapItemStats } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import {
  countActivities,
  countRoutes,
  countSelectedActivities,
  countSelectedRoutes,
} from '@/utils/strings';

import StatsList from './StatsList.vue';

const { counts } = defineProps<{
  counts: CombinedMapItemStats;
}>();

const activityCountString = computed(() => {
  if (!counts.activityCount) return;
  else if (counts.showSelected) return countSelectedActivities(counts.activityCount);
  else return countActivities(counts.activityCount);
});
const routeCountString = computed(() => {
  if (!counts.routeCount) return;
  else if (counts.showSelected) return countSelectedRoutes(counts.routeCount);
  else return countRoutes(counts.routeCount);
});
</script>

<template>
  <StatsList :stats="[activityCountString, routeCountString]" />
</template>
