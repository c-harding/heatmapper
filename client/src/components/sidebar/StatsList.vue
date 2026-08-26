<script setup lang="ts">
import { computed } from 'vue';

import UIIcon from '../ui/UIIcon.vue';

const { stats, icons } = defineProps<{
  stats: (string | undefined)[];
  icons?: string[];
}>();

const filteredStats = computed(() => stats.filter(Boolean));
</script>

<template>
  <div :class="$style.statsList">
    <div v-for="(stat, i) of filteredStats" :key="i" :class="$style.stat">{{ stat }}</div>
    <UIIcon v-for="(icon, i) of icons" :key="`icon-${i}`" :class="$style.statIcon" :icon inline />
  </div>
</template>

<style module lang="scss">
@use '../../styles/typography' as typography;

.statsList {
  @include typography.optical-centre;

  font-size: 0.75em;
  display: block;
  position: relative;
  // Not hidden: that would make the block axis a scroll container, which the trim gives something
  // to scroll
  overflow-x: clip;

  $separator-spacing: 0.75em;
  margin-right: -$separator-spacing;

  > .stat {
    display: inline-block;
    padding-left: $separator-spacing;
    text-indent: -$separator-spacing;

    &:not(:last-of-type) {
      margin-right: $separator-spacing;
    }

    &::before {
      display: inline-block;
      text-indent: 0;
      text-align: center;
      content: '•';
      margin-left: -$separator-spacing;
      width: $separator-spacing;
      pointer-events: none;
    }
  }

  .statIcon {
    margin-left: 0.25em;
  }
}
</style>
