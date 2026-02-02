<!--
  A simple component to render a list of items without breaking individual items onto new lines.

  The default slot is used to provide a fallback when there are no items to show.
-->
<script setup lang="ts">
const { items, empty } = defineProps<{ items: string[] | undefined; empty?: string }>();
</script>

<template>
  <span
    ><template v-if="items?.length">
      <template v-for="(item, i) of items" :key="i"
        ><span :class="$style.summarySpan">{{ item }}</span
        ><template v-if="i + 1 < items.length">, </template></template
      ></template
    ><slot v-else>{{ empty }}</slot></span
  >
</template>

<style lang="scss" module>
.summarySpan {
  white-space: nowrap;
}
</style>
