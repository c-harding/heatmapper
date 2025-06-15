<script setup lang="ts">
import { computed, ref } from 'vue';

import { type RangeFilter } from '@/types/FilterModel';

const model = defineModel<RangeFilter>();

const { scale = 1 } = defineProps<{ step?: number; min?: number; max?: number; scale?: number }>();

const input = ref<HTMLInputElement>();

function normaliseInput(value: string | number | undefined): number | undefined {
  if (typeof value === 'string' && !value.trim()) return undefined; // blank string => undefined

  const number = Number(value);

  return isNaN(number) ? undefined : number / scale;
}

function getWithScale(value: number | undefined) {
  if (value === undefined) return undefined;
  return value * scale;
}

function setModel(min: number | undefined, max: number | undefined) {
  if (min !== undefined || max !== undefined) {
    model.value = { min, max };
  } else {
    model.value = undefined;
  }
}

const minModel = computed({
  get: () => getWithScale(model.value?.min),
  set: (value: string | number | undefined) => setModel(normaliseInput(value), model.value?.max),
});

const maxModel = computed({
  get: () => getWithScale(model.value?.max),
  set: (value: string | number | undefined) => setModel(model.value?.min, normaliseInput(value)),
});
</script>

<!-- From https://acdcjunior.github.io/how-bind-date-object-to-input-date-vue.js-v-model.html -->
<template>
  <div :class="$style.inputContainer">
    <label
      ><span>min</span><input v-model="minModel" type="number" autocomplete="off" :min :max :step
    /></label>

    <label
      ><span>max</span><input v-model="maxModel" type="number" autocomplete="off" :min :max :step
    /></label>
  </div>
</template>

<style module lang="scss">
.inputContainer {
  display: flex;
  margin: 0.5rem;

  border-radius: var(--border-radius);
  border: 1px solid var(--color-weak);
  background-color: var(--background-strong);

  min-width: 3em;
  min-height: 1.75rem;
  box-sizing: border-box;

  label {
    display: contents;

    span {
      align-self: center;
      font-size: 0.9em;
      margin-left: 0.5rem;
      margin-right: 0.25rem;
    }
  }

  input {
    background-color: var(--background-full);
    border-radius: calc(var(--border-radius) - 1px);
    border: none;
    min-width: 1em;
    padding: 0.15rem 0.4rem;
    color: var(--color-full);
    appearance: none;
    -moz-appearance: textfield;

    &:focus {
      outline: none;
    }
  }

  .icon {
    margin-right: 4px;
  }
}
</style>
