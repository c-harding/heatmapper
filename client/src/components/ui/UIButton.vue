<script setup lang="ts">
import { computed, ref } from 'vue';

import ErrorTooltip from '../tooltip/ErrorTooltip.vue';
import { TooltipError } from '../tooltip/TooltipError';
import { type ShowError, useErrorTooltip } from '../tooltip/useErrorTooltip';
import UIIcon from './UIIcon.vue';
import UISpinner from './UISpinner.vue';

export interface ButtonError {
  error: unknown;
  showError: ShowError;
}

const props = withDefaults(
  defineProps<{
    icon?: string;
    loading?: boolean;
    disabled?: boolean;
    onClick?: () => void | Promise<void>;
    onRejection?: (value: ButtonError) => string | void;
  }>(),
  {
    icon: undefined,
    loading: false,
    disabled: false,
    onClick: undefined,
    onRejection: undefined,
  },
);

const { targetRef: buttonRef, errorMessage, dismissLast, showError } = useErrorTooltip();

const runningClickHandler = ref(false);

const loading = computed(() => props.loading || runningClickHandler.value);

async function clickHandler() {
  if (runningClickHandler.value) return;
  runningClickHandler.value = true;
  Promise.resolve(props.onClick?.())
    .catch((error: unknown) => {
      if (props.onRejection) {
        props.onRejection({ error, showError });
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
    <div class="button-contents">
      <UIIcon v-if="icon" inline>{{ icon }}</UIIcon>
      <slot />
    </div>
    <UISpinner v-if="loading" size="tiny" class="button-spinner" />
    <ErrorTooltip :error-message="errorMessage" @dismiss="dismissLast" />
  </button>
</template>

<style lang="scss" scoped>
button {
  display: grid;
  grid-template-areas: 'button';

  margin: 1ex;
  padding: 0.15em 0.4em;
  border-radius: 0.3em;
  border: 1px solid var(--color-weak);
  background-color: var(--background-slight);
  color: var(--color);
  max-width: max-content;
  min-width: min-content;
  font-size: 0.9em;

  &:hover:not(:disabled) {
    background-color: var(--background-strong);
  }

  &:disabled {
    color: var(--color-weak);
    border-color: var(--background-strong);
  }

  .button-contents {
    grid-area: button;
    display: flex;
    position: relative;
  }

  .icon {
    margin-right: 0.5ex;
  }

  &:has(.button-spinner) .button-contents {
    visibility: hidden;
  }

  .button-spinner {
    grid-area: button;
  }
}
</style>
