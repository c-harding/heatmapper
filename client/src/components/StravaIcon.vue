<script lang="ts">
// Set in vite.config.js
declare const USE_EMOJI: boolean | undefined;
</script>

<script setup lang="ts">
import type { SportType } from '@strava-heatmapper/shared/interfaces';

import { sportTypes } from '@/sportTypes';
import { sportIconEmoji } from '@/utils/emoji';
import { sportIconString } from '@/utils/icons';

const props = withDefaults(
  defineProps<{
    sportType: SportType;
  }>(),
  {},
);

const useEmoji = USE_EMOJI;
</script>

<template>
  <div v-if="useEmoji" class="emoji" :title="sportTypes[sportType]">
    {{ sportIconEmoji(sportType) }}
  </div>
  <svg v-else viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
    <title v-text="sportTypes[sportType]" />
    <path fillRule="evenodd" :d="sportIconString(sportType)" />
  </svg>
</template>

<style lang="scss">
.emoji {
  width: 1.5em;
  height: 1.5em;

  display: flex;
  align-items: center;
  font-variant-emoji: emoji;
  justify-content: center;
}
</style>
