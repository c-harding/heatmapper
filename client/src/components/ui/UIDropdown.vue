<script setup lang="ts">
import UIIcon from './UIIcon.vue';

export interface Option {
  value: string;
  label: string;
}

const {
  options,
  blankValue = null,
  blankLabel = null,
  clearButton = false,
} = defineProps<{
  options: Option[];
  blankValue: string | null;
  blankLabel: string | null;
  clearButton?: boolean;
}>();

const model = defineModel<string | null>({ default: null });
</script>

<template>
  <div class="dropdown">
    <select v-model="model">
      <option v-if="blankLabel" :value="blankValue">
        {{ blankLabel }}
      </option>
      <option v-if="blankLabel" disabled />
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
      <slot />
    </select>
    <UIIcon v-if="clearButton && model !== blankValue" inline large @click="model = blankValue">
      close
    </UIIcon>
    <UIIcon v-else class="down-arrow" inline large> expand_more </UIIcon>
  </div>
</template>

<style lang="scss">
.dropdown {
  display: flex;
  margin: 1ex;

  border-radius: var(--border-radius);
  border: 1px solid var(--color-weak);
  background-color: var(--background-strong);

  max-width: min-content;
  min-width: 3em;

  // Hack to prevent zooming on iOS when entering dropdown
  @media (hover: none) {
    font-size: 18px;
  }

  &:hover:has(select:not(:disabled)) {
    background-color: var(--background-weak);
  }

  &:has(select:disabled) {
    color: var(--color-weak);
    border-color: var(--background-weak);
  }

  select {
    flex-shrink: 1;
    min-width: 0;
    padding-inline-start: 1ex;
    margin-inline-end: -1.5em;
    padding-inline-end: 1.5em;
    border: none;
    appearance: none;
    background-color: transparent;
    font: inherit;
    color: inherit;
    font-size: 0.9em;
    text-overflow: ellipsis;

    &:focus {
      outline: none;
    }

    option {
      background-color: var(--background-full);
      color: var(--color-full);
    }
  }

  .down-arrow {
    pointer-events: none;
  }
}
</style>
