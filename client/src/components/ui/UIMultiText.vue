<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue';
const props = defineProps<{
  texts: Record<T, string>;
  selected?: T;
}>();

const textPairs = computed(() => Object.entries(props.texts));
const selected = computed(() =>
  props.selected && props.selected in props.texts ? props.selected : textPairs.value[0][0],
);
</script>

<template>
  <span class="multi-text"
    ><span
      v-for="pair of textPairs"
      :key="pair[0]"
      class="text"
      :class="{ selected: selected === pair[0] }"
      >{{ pair[1] }}</span
    ></span
  >
</template>

<style lang="scss" scoped>
.multi-text {
  display: inline-grid;
  grid-template-areas: 'multi-text';
  align-items: center;

  .text {
    grid-area: multi-text;

    &:not(.selected) {
      visibility: hidden;
    }
  }
}
</style>
