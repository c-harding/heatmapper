<script setup lang="ts">
import { ref } from 'vue';

import UIIcon from './UIIcon.vue';

withDefaults(
  defineProps<{
    modelValue?: Date | null;
    name?: string;
  }>(),
  {
    modelValue: null,
    name: undefined,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date | null): void;
}>();

const input = ref<HTMLInputElement>();

// Set to the start of the UTC day provided
function dateToYYYYMMDD(date: Date | null): string | null {
  return date?.toISOString().split('T', 1)[0] ?? null;
}
</script>

<!-- From https://acdcjunior.github.io/how-bind-date-object-to-input-date-vue.js-v-model.html -->
<template>
  <div class="date-input">
    <input
      ref="input"
      type="date"
      :name="name"
      :value="dateToYYYYMMDD(modelValue)"
      @change="emit('update:modelValue', input!.valueAsDate)"
    />
    <UIIcon class="icon">expand_more</UIIcon>
  </div>
</template>

<style lang="scss" scoped>
.date-input {
  display: flex;
  margin: 1ex;

  border-radius: var(--border-radius);
  border: 1px solid var(--color-weak);
  background-color: var(--background-strong);

  max-width: max-content;
  min-width: 3em;
}

input {
  background-color: inherit;
  border: none;
  margin: 0.5em 1em;
  color: var(--color-full);
  appearance: none;

  &:focus {
    outline: none;
  }
}

@supports not (-webkit-touch-callout: none) {
  .icon {
    display: none;
  }
}
</style>
