<script setup lang="ts">
import { ref } from 'vue';

import UIIcon from './UIIcon.vue';

const { name } = defineProps<{
  name?: string;
}>();

const model = defineModel<Date | null>({ default: null });

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
      autocomplete="off"
      :name="name"
      :value="dateToYYYYMMDD(model)"
      @change="model = input!.valueAsDate"
    />
    <UIIcon class="icon">expand_more</UIIcon>
  </div>
</template>

<style lang="scss" scoped>
.date-input {
  display: flex;
  margin: 0.5rem;

  border-radius: var(--border-radius);
  border: 1px solid var(--color-weak);
  background-color: var(--background-strong);

  max-width: max-content;
  min-width: 3em;
  min-height: 1.75rem;
  box-sizing: border-box;
}

input {
  background-color: inherit;
  border: none;
  margin: 0.15rem 0.4rem;
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
