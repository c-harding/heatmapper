<script setup lang="ts" generic="T">
import { computed } from 'vue';

import { type SegmentedControlItemContext } from './SegmentedControl.vue';

const props = withDefaults(
  defineProps<{ option: SegmentedControlItemContext; icon?: string; disabled?: boolean }>(),
  { icon: undefined, disabled: false },
);

const disabled = computed(() => props.option.disabled || props.disabled);
</script>

<template>
  <li :class="{ selected: option.selected, disabled }">
    <button :disabled="disabled" @click.prevent="option.select()">
      <div class="button-contents normal"><slot /></div>
      <div class="button-contents bold"><slot /></div>
    </button>
  </li>
</template>

<style scoped lang="scss">
li {
  list-style: none;
  position: relative;

  display: flex;
  margin: -1px;

  border-radius: var(--border-radius);
  border: 1px solid transparent;

  max-width: max-content;
  min-width: 2em;

  &.selected {
    border-color: var(--color-strong);
    background-color: var(--background-strong);
  }

  &.selected.disabled {
    border-color: var(--color-weak);
  }

  button {
    $button-padding: 0.15em;

    flex: 1;
    appearance: none;
    border: none;
    padding: $button-padding;
    background: none;
    color: var(--color-full);

    display: grid;
    grid-template-areas: 'button';
    font-size: 0.9em;

    > .button-contents {
      padding: 0 0.25em;
      border-radius: calc(var(--border-radius) - $button-padding);
      grid-area: button;
      display: flex;
      justify-content: center;
    }

    > .bold {
      font-weight: 600;
    }

    &:disabled {
      color: var(--color-weak);
    }
  }

  &.selected button > .button-contents.normal,
  &:not(.selected) button > .button-contents.bold {
    visibility: hidden;
  }

  &:not(.selected) button:hover:not(:disabled) > .button-contents {
    background-color: var(--background-strong);
  }
}

li:not(.selected) + li:not(.selected)::before {
  content: '';
  position: absolute;
  top: 0.3em;
  bottom: 0.3em;
  right: 100%;
  border-left: 1px solid var(--color-weak);
}

li.disabled:not(.selected) + li.disabled:not(.selected)::before {
  border-left-color: var(--background-weak);
}
</style>
