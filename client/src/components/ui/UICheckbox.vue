<script setup lang="ts">
import { computed } from 'vue';

import { useMaterialIcons } from './material-icons';
import UISpinner from './UISpinner.vue';

const {
  uncheckedIcon: rawUncheckedIcon = 'check_box_outline_blank',
  checkedIcon: rawCheckedIcon = 'check_box',
  iconScale = 1,
  loading = false,
  loadingText,
  disabled = false,
} = defineProps<{
  uncheckedIcon?: string;
  checkedIcon?: string;
  iconScale?: number;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
}>();

const isChecked = defineModel<boolean>({ default: false });

const uncheckedIcon = computed(() => `'${rawUncheckedIcon}'`);
const checkedIcon = computed(() => `'${rawCheckedIcon}'`);

useMaterialIcons();
</script>

<template>
  <label :class="[$style.uiCheckbox]">
    <!-- TODO: loading indicator -->
    <UISpinner v-if="loading" size="tiny">
      {{ loadingText }}
    </UISpinner>
    <input
      v-else
      v-model="isChecked"
      :class="$style.input"
      :disabled="loading || disabled"
      type="checkbox"
    />
    <div :class="[$style.label, disabled && $style.disabled]">
      <slot />
    </div>
  </label>
</template>

<style module lang="scss">
button.button {
  display: grid;
  grid-template-areas: 'button';
  align-items: center;

  margin: 0.5rem;
  padding: 0.15rem 0.4rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-weak);
  background-color: var(--background-strong);
  color: var(--color-full);
  max-width: max-content;
  min-width: min-content;
  min-height: 1.75rem;
  font-size: 0.9em;

  &:hover:not(:disabled) {
    background-color: var(--background-weak);
  }

  &:disabled {
    color: var(--color-weak);
    border-color: var(--background-weak);
  }

  &:has(.buttonSpinner) .buttonContents {
    visibility: hidden;
  }
}

.uiCheckbox {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding-inline: 0.5rem;

  > .input {
    appearance: none;
    display: flex;
    align-items: center;

    &::before {
      font-family: 'Material Icons';
      font-weight: normal;
      font-style: normal;
      font-size: calc(v-bind(iconScale) * 1.25rem);
      width: 1.25rem;
      overflow: hidden;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      font-feature-settings: 'liga';
      content: v-bind(uncheckedIcon);
      color: var(--color-weak);
      text-align: center;
    }

    &:hover::before {
      color: var(--color-mid);
    }

    &:checked::before {
      content: v-bind(checkedIcon);
    }
  }
}

.label {
  min-height: 1.2em;
  font-size: 0.9em;
  font-weight: 600;

  &.disabled {
    color: var(--color-weak);
  }
}
</style>
