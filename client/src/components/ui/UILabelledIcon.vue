<script setup lang="ts">
import UIIcon from './UIIcon.vue';

const { icon } = defineProps<{
  icon: string | undefined;
}>();
</script>

<template>
  <div class="ui-labelled-icon">
    <UIIcon
      :icon="icon"
      inline
    />
    <div class="label">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ui-labelled-icon {
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
