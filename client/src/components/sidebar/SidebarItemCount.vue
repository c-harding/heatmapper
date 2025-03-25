<script setup lang="ts">
import { type CombinedMapItemStats } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import { countActivities, countRoutes, countSelected } from '@/utils/strings';

import StatsList from './StatsList.vue';

const { counts } = defineProps<{
  counts: CombinedMapItemStats;
}>();

const activityCountString = computed(() =>
  counts.activityCount ? countActivities(counts.activityCount) : undefined,
);
const routeCountString = computed(() =>
  counts.routeCount ? countRoutes(counts.routeCount) : undefined,
);

const selectedCountString = computed(() =>
  counts.selectedCount ? countSelected(counts.selectedCount) : undefined,
);
</script>

<template>
  <StatsList :stats="[activityCountString, routeCountString, selectedCountString]" />
</template>
