<script setup lang="ts">
import { useMaterialIcons } from './material-icons';

const {
  icon,
  inline = false,
  large = false,
  bottom = false,
  rotation = 0,
} = defineProps<{
  icon: string | undefined;
  inline?: boolean;
  large?: boolean;
  placeholder?: boolean;
  bottom?: boolean;
  rotation?: number;
}>();

useMaterialIcons();
</script>

<template>
  <i
    v-if="icon"
    v-bind="$attrs"
    :class="[
      'material-icons',
      $style.icon,
      $style.materialIcons,
      inline && $style.inline,
      large && $style.large,
      placeholder && $style.placeholder,
      bottom && $style.bottom,
    ]"
    >{{ icon }}</i
  >
</template>

<style module lang="scss">
.icon {
  user-select: none;
  width: 1em;
  overflow: hidden;
  transform: rotate(calc(v-bind(rotation) * 1deg));
  transition: transform var(--transition-speed);

  &.inline {
    vertical-align: middle;
    align-self: center;
    font-size: 1em;
  }
  &.large {
    font-size: 1.5em;
  }
  &.placeholder {
    visibility: hidden;
  }
  &.bottom {
    vertical-align: bottom;
  }
}
</style>
