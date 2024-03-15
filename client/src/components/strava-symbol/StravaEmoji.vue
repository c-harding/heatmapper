<script setup lang="ts">
import { sportTypes } from '@/sportTypes';
import { sportIconEmoji } from '@/utils/emoji';

import type StravaSymbolProps from './StravaSymbolProps';

defineProps<StravaSymbolProps>();
</script>

<template>
  <div class="emoji" :title="sportTypes[sportType]">
    {{ sportIconEmoji(sportType) }}
  </div>
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
