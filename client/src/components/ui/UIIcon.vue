<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { computed } from 'vue';

const {
  inline = false,
  large = false,
  placeholder = false,
  bottom = false,
} = defineProps<{
  inline?: boolean;
  large?: boolean;
  placeholder?: boolean;
  bottom?: boolean;
}>();

const generated = computed(() => {
  if (placeholder) return 'crop_square';
  return '';
});

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
  <i v-bind="$attrs" class="icon material-icons" :class="{ inline, large, placeholder, bottom }"
    >{{ generated }}<slot v-if="!generated"
  /></i>
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
