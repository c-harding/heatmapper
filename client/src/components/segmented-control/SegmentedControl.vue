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
  <ul :class="{ disabled }">
    <slot :option="option" />
  </ul>
</template>

<style scoped lang="scss">
ul {
  display: flex;
  gap: 1px;
  margin: 0.5rem;
  padding: 0;

  border-radius: var(--border-radius);
  border: 1px solid var(--color-weak);
  background-color: var(--background-mid);

  max-width: min-content;
  min-width: 3em;

  &.disabled {
    color: var(--color-weak);
    border-color: var(--background-weak);
    background-color: var(--background-weak);
  }
}
</style>
