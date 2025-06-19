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
  invertColor = false,
  disabled = false,
  ghost = false,
  light = false,
  onClick,
  onDblClick,
  onRejection,
} = defineProps<{
  icon?: string;
  loading?: boolean;
  invertColor?: boolean;
  loadingText?: string;
  disabled?: boolean;
  light?: boolean;
  ghost?: boolean;
  onClick?: () => void | Promise<void>;
  onDblClick?: () => void | Promise<void>;
  onRejection?: (value: ButtonError) => string | void;
}>();

const { targetRef: buttonRef, errorMessage, dismissLast, showError } = useErrorTooltip();

const runningClickHandler = ref(false);

const loading = computed(() => loadingProp || runningClickHandler.value);

async function clickHandler(e: MouseEvent) {
  let handler = onClick;
  if (onDblClick && e.detail === 2) {
    handler = onDblClick;
  } else if (runningClickHandler.value) {
    return;
  }

  runningClickHandler.value = true;
  Promise.try(() => handler?.())
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
  <button
    ref="buttonRef"
    :class="[
      $style.button,
      invertColor && $style.invertColor,
      ghost && $style.ghost,
      light && !invertColor && $style.light,
    ]"
    :disabled="loading || disabled"
    :loading
    @click="clickHandler"
  >
    <UILabelledIcon :icon :class="$style.buttonContents">
      <slot />
    </UILabelledIcon>
    <UISpinner v-if="loading" size="tiny" :class="$style.buttonSpinner">
      {{ loadingText }}
    </UISpinner>
    <ErrorTooltip :errorMessage @dismiss="dismissLast" />
  </button>
</template>

<style module lang="scss">
button.button {
  display: grid;
  grid-template-areas: 'button';

  margin: 0.5rem;
  padding: 0.15rem 0.15rem;

  --button-border-radius-left: var(--border-radius);
  --button-border-radius-right: var(--border-radius);

  border-top-left-radius: var(--button-border-radius-left);
  border-bottom-left-radius: var(--button-border-radius-left);
  border-top-right-radius: var(--button-border-radius-right);
  border-bottom-right-radius: var(--button-border-radius-right);

  border: 1px solid var(--color-weak);
  background-color: var(--background-mid);
  color: var(--color-full);
  max-width: max-content;
  min-width: min-content;
  min-height: 1.75rem;
  font-size: 0.9em;

  &:disabled {
    color: var(--color-weak);
    border-color: var(--background-weak);
  }

  .buttonContents {
    grid-area: button;
    min-height: 1.2em;

    border-top-left-radius: calc(var(--button-border-radius-left) - 0.15rem);
    border-bottom-left-radius: calc(var(--button-border-radius-left) - 0.15rem);
    border-top-right-radius: calc(var(--button-border-radius-right) - 0.15rem);
    border-bottom-right-radius: calc(var(--button-border-radius-right) - 0.15rem);

    padding: 0 0.25rem;
    align-self: stretch;
    display: flex;
    align-items: center;
  }

  &:hover:not(:disabled) .buttonContents {
    background-color: var(--background-strong);
  }

  &:has(.buttonSpinner) .buttonContents {
    visibility: hidden;
  }

  .buttonSpinner {
    grid-area: button;
  }

  &.light {
    background-color: var(--background-strong);

    &:hover:not(:disabled) {
      background-color: var(--background-weak);

      .buttonContents {
        background-color: unset;
      }
    }
  }

  &.invertColor {
    border-color: var(--color-full);
    background-color: var(--color-full);
    color: var(--background-strong);

    &:hover:not(:disabled) .buttonContents {
      background-color: var(--color-full);
      color: var(--background-weak);
    }

    &:disabled {
      background-color: var(--color-weak);
      border-color: var(--background-weak);
    }
  }

  &.ghost {
    border: none;
    background: none;
    color: var(--color-mid);
    padding: 0;
    margin: 0;
    min-height: unset;
    font-size: unset;

    .buttonContents {
      padding: 0;
      min-height: unset;
    }

    &:hover {
      color: var(--color-full);
    }

    &:hover:not(:disabled) .buttonContents {
      background: none;
    }
  }
}
</style>
