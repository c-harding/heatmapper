<script setup lang="ts">
import { computed } from 'vue';

import { type LoadingStats } from '@/stores/ActivityStore';
import { loadingStatus } from '@/utils/loadingStatus';

const {
  stats,
  useRoutes = false,
  error,
} = defineProps<{
  stats?: LoadingStats;
  useRoutes?: boolean;
  error?: string;
}>();

const findingString = computed(() => stats && loadingStatus(stats, useRoutes));
</script>

<template>
  <p :class="[$style.small, error && $style.error]">
    {{ error || findingString }}
  </p>
</template>

<style module lang="scss">
.error {
  color: red;
}

p.small {
  font-size: 0.8em;
  margin: 0;
}
</style>
