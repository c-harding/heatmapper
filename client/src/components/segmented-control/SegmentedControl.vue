<script setup lang="ts" generic="T">
export interface SegmentedControlItemContext {
  selected: boolean;
  select: () => void;
  disabled: boolean;
}

const { disabled = false } = defineProps<{ disabled?: boolean }>();

const model = defineModel<T>();

defineSlots<{
  default(props: { option: (value: T) => SegmentedControlItemContext }): unknown;
}>();

function option(value: T): SegmentedControlItemContext {
  return {
    selected: model.value === value,
    select: () => (model.value = value),
    disabled,
  };
}
</script>
<template>
  <ul :class="[$style.segmentedControl, disabled && $style.disabled]">
    <slot :option />
  </ul>
</template>

<style module lang="scss">
ul.segmentedControl {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  margin: 0.5rem;
  padding: 0;

  border-radius: var(--border-radius);
  border: 1px solid var(--color-weak);
  background-color: var(--background-mid);

  min-width: 3em;

  &.disabled {
    color: var(--color-weak);
    border-color: var(--background-weak);
    background-color: var(--background-weak);
  }
}
</style>
