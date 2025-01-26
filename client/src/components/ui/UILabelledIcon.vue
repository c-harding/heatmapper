<script setup lang="ts">
import UIIcon from './UIIcon.vue';

const { icon } = defineProps<{
  icon: string | undefined;
}>();
</script>

<template>
  <div :class="$style.uiLabelledIcon">
    <UIIcon :icon="icon" inline />
    <div :class="$style.label">
      <slot />
    </div>
  </div>
</template>

<style module lang="scss">
.uiLabelledIcon {
  display: flex;
  justify-content: center;

  &:has(> :not(:empty) ~ :not(:empty)) {
    gap: 0.5ch;
  }

  .label {
    flex: 1;
  }
}
</style>
