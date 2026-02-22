<script setup lang="ts">
import { computed, ref } from 'vue';

import { type RangeFilter } from '@/types/FilterModel';

const model = defineModel<RangeFilter>();

const { scale = 1 } = defineProps<{
  step?: number;
  min?: number;
  max?: number;
  scale?: number;
  suffix: string;
}>();

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
    <label>
      <span>min</span>
      <input v-model="minModel" type="number" autocomplete="off" :min :max :step />
      <span>{{ suffix }}</span>
    </label>

    <label>
      <span>max</span>
      <input v-model="maxModel" type="number" autocomplete="off" :min :max :step />
      <span>{{ suffix }}</span>
    </label>
  </div>
</template>

<style module lang="scss">
.inputContainer {
  display: grid;
  grid-template-columns: min-content auto min-content;
  margin: 0.5rem;

  border-radius: var(--border-radius);
  background-color: var(--background-strong);

  min-width: 3em;
  min-height: 1.75rem;
  box-sizing: border-box;

  label {
    display: grid;
    grid-column: span 3;
    grid-template-columns: subgrid;
    border: 1px solid var(--color-weak);
    padding-inline: 0.25rem;

    &:not(:first-child) {
      margin-top: -1px;
    }

    span {
      align-self: center;
      font-size: 0.9em;
      margin-inline: 0.25rem;
    }
  }

  label:first-child {
    border-top-left-radius: calc(var(--border-radius));
    border-top-right-radius: calc(var(--border-radius));
  }

  label:last-child {
    border-bottom-left-radius: calc(var(--border-radius));
    border-bottom-right-radius: calc(var(--border-radius));
  }

  input {
    background-color: var(--background-full);
    border: none;
    min-width: 1em;
    padding: 0.15rem 0.4rem;
    color: var(--color-full);
    font-size: 0.9em;

    appearance: none;
    -moz-appearance: textfield;

    // Hack to prevent zooming on iOS when entering dropdown
    @media (hover: none) {
      font-size: 18px;
    }

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    &:focus {
      z-index: 1;
    }
  }

  .icon {
    margin-right: 4px;
  }
}
</style>
