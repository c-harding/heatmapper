<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue';

const { texts, selected } = defineProps<{
  texts?: Record<T, string>;
  selected?: T;
}>();

const slots = defineSlots<{ [x in T]: unknown }>();

const keys = computed(() => (texts ? Object.keys(texts) : Object.keys(slots)) as T[]);

const allTexts = computed(() => texts as Record<string | number, string>);
</script>

<template>
  <div :class="$style.multiText">
    <div
      v-for="key of keys"
      :key
      :class="[$style.multiTextItem, selected === key && $style.selected]"
    >
      <template v-if="allTexts"> {{ allTexts?.[key] }} </template><slot :name="key" />
    </div>
  </div>
</template>

<style module lang="scss">
.multiText {
  display: inline-grid;
  grid-template-areas: 'multi-text';
  align-items: center;

  .multiTextItem {
    grid-area: multi-text;
    display: flex;
    flex-direction: row;
    justify-content: center;

    > :only-child {
      flex: 1;
    }

    &:not(.selected) {
      visibility: hidden;
    }
  }
}
</style>
