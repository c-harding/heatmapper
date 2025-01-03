<script lang="ts">
const [ascentArrow, descentArrow] = document.dir === 'rtl' ? ['↖', '↙'] : ['↗', '↘'];
</script>

<script setup lang="ts">
import type { MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import { formatKilometers, formatDuration, formatMeters } from '@/utils/numberFormat';
import { getElevationGain, getElevationLoss } from '@/utils/elevationConfig';

const { item } = defineProps<{
  item: MapItem;
}>();

const distanceString = computed(() => {
  return formatKilometers(item.distance);
});

const movingTime = computed(() => {
  const time = !item.route && item.movingTime;
  if (!time) return undefined;

  return formatDuration(time);
});

const elevationString = computed(() => {
  if (!item.elevation) return;
  const elevationGain = getElevationGain(item);
  const elevationGainString = elevationGain && `${ascentArrow} ${formatMeters(elevationGain)}`;

  const elevationLoss = getElevationLoss(item);
  const elevationLossString = elevationLoss && `${descentArrow} ${formatMeters(elevationLoss)}`;

  if (elevationGain !== undefined && elevationLoss !== undefined) {
    return `${elevationGainString} ${elevationLossString}`;
  } else {
    return elevationGainString ?? elevationLossString;
  }
});

const stats = computed(() =>
  [distanceString.value, elevationString.value, movingTime.value].filter(Boolean).join(' • '),
);
</script>

<template>
  <div class="sidebar-item-stats" v-text="stats" />
</template>

<style lang="scss">
.sidebar-item-stats {
  font-size: 0.75em;
}
</style>
