<script setup lang="ts">
import UIIcon from './UIIcon.vue';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const {
  options,
  blankValue,
  blankLabel,
  clearButton = false,
} = defineProps<{
  options: DropdownOption[];
  blankValue?: string;
  blankLabel?: string;
  clearButton?: boolean;
}>();

const model = defineModel<string | undefined>({ default: undefined });
</script>

<template>
  <div :class="$style.dropdown">
    <select v-model="model">
      <option v-if="blankLabel" :value="blankValue">
        {{ blankLabel }}
      </option>
      <option v-if="blankLabel" disabled />
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
      <slot />
    </select>
    <UIIcon
      v-if="clearButton && model !== blankValue"
      inline
      icon="close"
      @click="model = blankValue"
    />
    <UIIcon v-else :class="$style.downArrow" inline large icon="expand_more" />
  </div>
</template>

<style module lang="scss">
.dropdown {
  display: flex;
  margin: 0.5rem;
  min-height: 1.75rem;
  box-sizing: border-box;

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
    padding-inline-start: 0.5rem;
    margin-inline-end: -1.5rem;
    padding-inline-end: 1.5rem;
    border: none;
    border-radius: inherit;
    appearance: none;
    background-color: transparent;
    font: inherit;
    color: inherit;
    font-size: 0.9em;
    text-overflow: ellipsis;

    option {
      background-color: var(--background-full);
      color: var(--color-full);
    }
  }

  .downArrow {
    pointer-events: none;
  }
}
</style>
