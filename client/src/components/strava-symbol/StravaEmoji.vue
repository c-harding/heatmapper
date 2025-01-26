<script setup lang="ts">
import { sportTypes } from '@strava-heatmapper/shared/interfaces';

import { sportIconEmoji } from '@/utils/emoji';

import type StravaSymbolProps from './StravaSymbolProps';

const { sportType } = defineProps<StravaSymbolProps>();
</script>

<template>
  <div :class="$style.emoji" :title="sportTypes[sportType]">
    {{ sportIconEmoji(sportType) }}
  </div>
</template>

<style module lang="scss">
.emoji {
  width: 1.5em;
  height: 1.5em;

  display: flex;
  align-items: center;
  font-variant-emoji: emoji;
  justify-content: center;
}
</style>
