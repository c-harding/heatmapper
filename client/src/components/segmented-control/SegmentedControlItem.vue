<script setup lang="ts" generic="T">
import { computed } from 'vue';

import { type SegmentedControlItemContext } from './SegmentedControl.vue';

const { option, disabled: disabledProp = false } = defineProps<{
  option: SegmentedControlItemContext;
  disabled?: boolean;
}>();

const disabled = computed(() => option.disabled || disabledProp);

function select() {
  if (!option.selected) {
    option.select();
  } else if (option.deselect) {
    option.deselect();
  }
}
</script>

<template>
  <li
    :class="[
      $style.segmentedControlItem,
      option.selected && $style.selected,
      disabled && $style.disabled,
    ]"
  >
    <button :disabled @click.prevent="select()">
      <div :class="[$style.buttonContents, $style.normal]">
        <slot />
      </div>
      <div :class="[$style.buttonContents, $style.bold]">
        <slot />
      </div>
    </button>
  </li>
</template>

<style module lang="scss">
li.segmentedControlItem {
  list-style: none;
  position: relative;

  display: flex;
  margin: -1px;

  border-radius: var(--border-radius);
  border: 1px solid transparent;

  min-height: 1.75rem;
  box-sizing: border-box;
  flex-grow: 1;

  &.selected {
    border-color: var(--color-strong);
    background-color: var(--background-strong);
    z-index: 1;
  }

  &.selected.disabled {
    border-color: var(--color-weak);
  }

  > button {
    $button-padding: 0.15rem;

    flex: 1;
    appearance: none;
    border: none;
    padding: $button-padding;
    background: none;
    color: var(--color-full);

    display: grid;
    grid-template-areas: 'button';
    font-size: 0.9em;
    min-width: 2em;

    > .buttonContents {
      padding: 0 0.25em;
      border-radius: calc(var(--border-radius) - $button-padding);
      grid-area: button;
      display: flex;
      justify-content: center;
      align-items: center;
      align-self: stretch;
    }

    > .bold {
      font-weight: 600;
    }

    &:disabled {
      color: var(--color-weak);
    }
  }

  &.selected button > .buttonContents.normal,
  &:not(.selected) button > .buttonContents.bold {
    visibility: hidden;
  }

  &:not(.selected) button:hover:not(:disabled) > .buttonContents {
    background-color: var(--background-strong);
  }
}

li.segmentedControlItem:not(.selected) + li.segmentedControlItem:not(.selected)::before {
  content: '';
  position: absolute;
  inset-block: 0.3em;
  inset-inline-end: 100%;
  border-left: 1px solid var(--color-weak);
}

li.disabled:not(.selected) + li.disabled:not(.selected)::before {
  border-left-color: var(--background-weak);
}
</style>
