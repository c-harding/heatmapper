<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue';

import UILabelledIcon from './UILabelledIcon.vue';

const {
  texts,
  icons: iconsProp = {},
  selected: selectedProp,
} = defineProps<{
  texts: Record<T, string>;
  icons?: Partial<Record<T, string>>;
  selected?: T;
}>();

// Needed for type inference
const icons = computed<Partial<Record<T, string>>>(() => iconsProp);

const textPairs = computed(() => Object.entries(texts) as [T, string][]);
const selected = computed(() =>
  selectedProp && selectedProp in texts ? selectedProp : textPairs.value[0][0],
);
</script>

<template>
  <div class="multi-text">
    <UILabelledIcon
      v-for="pair of textPairs"
      :key="pair[0]"
      :icon="icons[pair[0]]"
      :class="{ selected: selected === pair[0] }"
      >{{ pair[1] }}</UILabelledIcon
    >
  </div>
</template>

<style lang="scss" scoped>
.multi-text {
  display: inline-grid;
  grid-template-areas: 'multi-text';
  align-items: center;

  .ui-labelled-icon {
    grid-area: multi-text;

    &:not(.selected) {
      visibility: hidden;
    }
  }
}
</style>
