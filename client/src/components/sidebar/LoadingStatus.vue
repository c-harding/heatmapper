<script setup lang="ts">
import { computed } from 'vue';

import { type LoadingStats } from '@/services/ActivityService';
import { capitalise, countActivities, countRoutes } from '@/utils/strings';

const {
  stats,
  useRoutes = false,
  error,
} = defineProps<{
  stats: LoadingStats;
  useRoutes?: boolean;
  error?: string;
}>();

const findingString = computed(() => {
  const {
    cleared = false,
    closed = false,
    inCache = false,
    finding: { started = false, finished = false, length = 0 } = {},
  } = stats;

  const countItems = useRoutes ? countRoutes : countActivities;
  if (cleared) return `cleared cache`;
  if (finished && inCache) return `found ${countItems(length)} in cache`;
  if (finished || closed) return `found ${countItems(length)}`;
  if (length) return `found ${countItems(length)} so far`;
  if (started) return `finding ${countItems(null)}`;
  return '';
});
</script>

<template>
  <p class="small" :class="{ error }">{{ error || capitalise(findingString) }}</p>
</template>

<style lang="scss" scoped>
.error {
  color: red;
}

p.small {
  font-size: 0.8em;
  margin: 0;
}
</style>
