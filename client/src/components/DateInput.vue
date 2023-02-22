<script setup lang="ts">
import { $ref } from 'vue/macros';

import Icon from './Icon.vue';

const { modelValue = null, name } = defineProps<{
  modelValue?: Date | null;
  name?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date | null): void;
}>();

const input = $ref<HTMLInputElement>();

// Set to the start of the UTC day provided
function dateToYYYYMMDD(date: Date | null): string | null {
  return date && date.toISOString().split('T', 1)[0];
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
      @change="emit('update:modelValue', input.valueAsDate)"
    />
    <Icon class="icon"> expand_more </Icon>
  </div>
</template>

<style lang="scss" scoped>
.date-input {
  display: flex;
  margin: 1ex;

  border-radius: 0.3em;
  border: 1px solid gray;
  background-color: var(--background-slight);

  max-width: max-content;
  min-width: 3em;
}

input {
  background-color: inherit;
  border: none;
  border-radius: 0.3em;
  margin: 0.5em 1em;
  color: var(--color);
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
