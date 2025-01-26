<script setup lang="ts">
import { computed } from 'vue';

const { stats } = defineProps<{
  stats: (string | undefined)[];
}>();

const filteredStats = computed(() => stats.filter(Boolean));
</script>

<template>
  <div :class="$style.statsList">
    <template v-for="(stat, _i) of filteredStats" :key="_i">
      <div :class="$style.stat">{{ stat }}</div>
    </template>
  </div>
</template>

<style module lang="scss">
.statsList {
  font-size: 0.75em;
  display: block;
  position: relative;
  overflow-x: hidden;

  $separator-spacing: 0.75em;
  margin-right: -$separator-spacing;

  > .stat {
    display: inline-block;
    padding-left: $separator-spacing;
    text-indent: -$separator-spacing;
    margin-right: $separator-spacing;

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
}
</style>
