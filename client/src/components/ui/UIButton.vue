<script setup lang="ts">
import { computed, ref } from 'vue';

import ErrorTooltip from '../tooltip/ErrorTooltip.vue';
import { TooltipError } from '../tooltip/TooltipError';
import { type ShowError, useErrorTooltip } from '../tooltip/useErrorTooltip';
import UILabelledIcon from './UILabelledIcon.vue';
import UISpinner from './UISpinner.vue';

export interface ButtonError {
  error: unknown;
  showError: ShowError;
}

const {
  icon,
  loading: loadingProp = false,
  loadingText,
  disabled = false,
  onClick,
  onRejection,
} = defineProps<{
  icon?: string;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
  onRejection?: (value: ButtonError) => string | void;
}>();

const { targetRef: buttonRef, errorMessage, dismissLast, showError } = useErrorTooltip();

const runningClickHandler = ref(false);

const loading = computed(() => loadingProp || runningClickHandler.value);

async function clickHandler() {
  if (runningClickHandler.value) return;
  runningClickHandler.value = true;
  Promise.resolve(onClick?.())
    .catch((error: unknown) => {
      if (onRejection) {
        onRejection({ error, showError });
      } else if (error instanceof TooltipError) {
        const dismiss = showError(error.message, error.timeout);
        error.dismissalPromise?.then(dismiss);
      } else {
        console.error('UIButton@click encounted an error:', error);
      }
    })
    .finally(() => (runningClickHandler.value = false));
}
</script>

<template>
  <button ref="buttonRef" :disabled="loading || disabled" :loading="loading" @click="clickHandler">
    <UILabelledIcon :icon="icon" class="button-contents">
      <slot />
    </UILabelledIcon>
    <UISpinner v-if="loading" size="tiny" class="button-spinner">
      {{ loadingText }}
    </UISpinner>
    <ErrorTooltip :error-message="errorMessage" @dismiss="dismissLast" />
  </button>
</template>

<style lang="scss" scoped>
button {
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

  .button-contents {
    grid-area: button;
    min-height: 1.2em;
  }

  &:has(.button-spinner) .button-contents {
    visibility: hidden;
  }

  .button-spinner {
    grid-area: button;
  }
}
</style>
