<script setup lang="ts">
import UIIcon from './UIIcon.vue';

const { icon } = defineProps<{
  icon: string | undefined;
}>();
</script>

<template>
  <div :class="$style.uiLabelledIcon">
    <UIIcon :icon inline aria-hidden="true" />
    <div :class="$style.label">
      <slot />
    </div>
  </div>
</template>

<style module lang="scss">
@use '../../styles/typography' as typography;

.uiLabelledIcon {
  display: flex;
  justify-content: center;
  // The label's baseline, not the icon's, which centres itself, so it lines up with plain text
  align-items: baseline;

  &:has(> :not(:empty) ~ :not(:empty)) {
    gap: 0.5ch;
  }

  .label {
    flex: 1;

    @include typography.optical-centre;
  }
}
</style>
