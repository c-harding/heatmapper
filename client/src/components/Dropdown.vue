<script setup lang="ts">
import { $computed } from 'vue/macros';

import Icon from './Icon.vue';

const {
  modelValue = null,
  blankValue = null,
  blankLabel = null,
  clearButton = false,
  options,
} = defineProps<{
  modelValue: string;
  blankValue: string | null;
  blankLabel: string | null;
  clearButton?: boolean;
  options: {
    value: string;
    label: string;
  }[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void;
}>();

const model = $computed<string | null>({
  get() {
    return modelValue;
  },
  set(value) {
    if (value !== null) {
      emit('update:modelValue', value);
    }
  },
});
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
    <Icon v-if="clearButton && model !== blankValue" inline large @click="model = blankValue">
      close
    </Icon>
    <Icon v-else class="down-arrow" inline large> expand_more </Icon>
  </div>
</template>

<style lang="scss">
.dropdown {
  display: flex;
  margin: 1ex;

  border-radius: 0.3em;
  border: 1px solid gray;
  background-color: var(--background-slight);

  max-width: min-content;
  min-width: 3em;

  // Hack to prevent zooming on iOS when entering dropdown
  @media (hover: none) {
    font-size: 18px;
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
  }

  .down-arrow {
    pointer-events: none;
  }
}
</style>
