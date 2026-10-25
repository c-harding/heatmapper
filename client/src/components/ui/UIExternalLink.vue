<script setup lang="ts">
import UIIcon from './UIIcon.vue';

const { href } = defineProps<{
  href: string;
}>();
</script>

<!--
  No space before the icon, which the underline would cover. The word joiner keeps the icon on the
  text's line: it forbids a break after the text, and nowrap a break between it and the icon.
-->
<template>
  <a :href target="_blank"
    ><slot /><span :class="$style.icon"
      >&#8288;<UIIcon icon="north_east" inline label="opens in a new tab"
    /></span>
  </a>
</template>

<style module lang="scss">
.icon {
  white-space: nowrap;

  > * {
    margin-inline-start: 0.25em;
  }
}
</style>
