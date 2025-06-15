<script lang="ts">
import style from './tab.module.scss';

export interface Tab<T extends string> {
  readonly id: T;
  readonly isOpen: boolean;
  select(this: void): void;
  toggle(this: void): void;
}
</script>

<script setup lang="ts" generic="T extends string">
const selected = defineModel<T>();

class TabImpl implements Tab<T> {
  constructor(readonly id: T) {}
  get isOpen() {
    return selected.value === this.id;
  }

  readonly select = () => {
    selected.value = this.id;
  };
  readonly toggle = () => {
    if (this.isOpen) {
      selected.value = undefined;
    } else {
      selected.value = this.id;
    }
  };
}

const makeTab = (id: T) => new TabImpl(id);
</script>

<template>
  <div :class="style.filterGrid">
    <slot :selected="selected" :makeTab="makeTab" />
  </div>
</template>
