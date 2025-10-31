<script lang="ts">
const [ascentArrow, descentArrow] = document.dir === 'rtl' ? ['↖', '↙'] : ['↗', '↘'];
</script>

<script setup lang="ts">
import { type MapItemStats } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import { getElevationGain, getElevationLoss } from '@/utils/elevationConfig';
import { formatDuration, formatKilometers, formatMeters } from '@/utils/numberFormat';

import StatsList from './StatsList.vue';

const { item, additionalStats } = defineProps<{
  item: MapItemStats;
  additionalStats?: (string | false | undefined | null)[];
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

const stats = computed(() => {
  const baseStats = [distanceString.value, elevationString.value, movingTime.value];

  return [...baseStats, ...(additionalStats ?? [])]?.filter(Boolean) as string[];
});
</script>

<template>
  <StatsList :stats />
</template>
