<script setup lang="ts">
import { useHead } from '@unhead/vue';

const {
  icon,
  inline = false,
  large = false,
  bottom = false,
} = defineProps<{
  icon: string | undefined;
  inline?: boolean;
  large?: boolean;
  placeholder?: boolean;
  bottom?: boolean;
}>();

useHead({
  link: [
    {
      href: 'https://fonts.googleapis.com/icon?family=Material+Icons',
      rel: 'stylesheet',
    },
  ],
});
</script>

<template>
  <i
    v-if="icon"
    v-bind="$attrs"
    class="icon material-icons"
    :class="{ inline, large, placeholder, bottom }"
    >{{ icon }}</i
  >
</template>

<style lang="scss">
.material-icons {
  user-select: none;
  width: 1em;
  overflow: hidden;

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
