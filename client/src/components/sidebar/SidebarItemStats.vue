<script lang="ts">
const [ascentArrow, descentArrow] = document.dir === 'rtl' ? ['↖', '↙'] : ['↗', '↘'];
</script>

<script setup lang="ts">
import { type MapItemStats } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import { getElevationGain, getElevationLoss } from '@/utils/elevationConfig';
import { formatDuration, formatKilometers, formatMeters } from '@/utils/numberFormat';

import StatsList from './StatsList.vue';

const { item } = defineProps<{
  item: MapItemStats;
}>();

const distanceString = computed(() => formatKilometers(item.distance));

const movingTime = computed(() => {
  const time = !item.route && item.movingTime;
  if (!time) return undefined;

  return formatDuration(time);
});

const elevationString = computed(() => {
  if (!item.elevation) return;
  const elevationGain = getElevationGain(item);
  const elevationGainString = elevationGain
    ? `${ascentArrow} ${formatMeters(elevationGain)}`
    : undefined;

  const elevationLoss = getElevationLoss(item);
  const elevationLossString = elevationLoss
    ? `${descentArrow} ${formatMeters(elevationLoss)}`
    : undefined;

  if (elevationGain !== undefined && elevationLoss !== undefined) {
    return `${elevationGainString} ${elevationLossString}`;
  } else {
    return elevationGainString ?? elevationLossString;
  }
});
</script>

<template>
  <StatsList :stats="[distanceString, elevationString, movingTime]" />
</template>
