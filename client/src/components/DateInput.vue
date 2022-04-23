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

// Set to the start of the day provided, in local time
function dateToYYYYMMDD(date: Date | null): string | null {
  // alternative implementations in https://stackoverflow.com/q/23593052/1850609
  return (
    date &&
    new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0]
  );
}

function updateValue(): void {
  const rawDate = input.valueAsDate;
  emit(
    'update:modelValue',
    rawDate && new Date(rawDate.getTime() + rawDate.getTimezoneOffset() * 60 * 1000),
  );
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
      @change="updateValue"
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
