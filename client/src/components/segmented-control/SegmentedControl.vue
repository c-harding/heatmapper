<script setup lang="ts" generic="T">
export interface SegmentedControlItemContext {
  selected: boolean;
  select: () => void;
  disabled: boolean;
  deselect?: () => void;
}

const { disabled = false, deselectValue } = defineProps<{
  disabled?: boolean;
  deselectValue?: [T];
}>();

const model = defineModel<T>({ required: true });

defineSlots<{
  default(props: { option: (value: T) => SegmentedControlItemContext }): unknown;
}>();

function option(value: T): SegmentedControlItemContext {
  return {
    selected: model.value === value,
    select: () => (model.value = value),
    disabled,

    // This conversion is sound because allowDeselect can only be true if T includes undefined
    deselect: deselectValue ? () => (model.value = deselectValue[0]) : undefined,
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
