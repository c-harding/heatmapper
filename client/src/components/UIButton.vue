<script setup lang="ts">
import { computed, ref } from 'vue';

import Icon from './Icon.vue';
import Spinner from './Spinner.vue';

const props = withDefaults(
  defineProps<{
    icon?: string;
    loading?: boolean;
    disabled?: boolean;
    onClick?: () => void | Promise<void>;
    onReject?: (value: unknown) => void;
  }>(),
  {
    icon: undefined,
    loading: false,
    disabled: false,
    onClick: undefined,
    onReject: undefined,
  },
);

const runningClickHandler = ref(false);

const loading = computed(() => props.loading || runningClickHandler.value);

async function clickHandler() {
  if (runningClickHandler.value) return;
  runningClickHandler.value = true;
  Promise.resolve(props.onClick?.())
    .catch((error: unknown) => {
      if (props.onReject) {
        props.onReject(error);
      } else {
        console.error('UIButton@click encounted an error:', error);
      }
    })
    .finally(() => (runningClickHandler.value = false));
}
</script>

<template>
  <button :disabled="loading || disabled" :loading="loading" @click="clickHandler">
    <div class="button-contents">
      <Icon v-if="icon" inline>{{ icon }}</Icon>
      <slot />
    </div>
    <Spinner v-if="loading" size="tiny" class="button-spinner" />
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
