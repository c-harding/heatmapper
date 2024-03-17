<script setup lang="ts" generic="T extends string">
import { onMounted, onUnmounted, ref } from 'vue';

import UIIcon from '../ui/UIIcon.vue';

export interface DropdownChoice<T> {
  readonly value: T;
  readonly label: string;
}

type Choice = DropdownChoice<T>;

const clickedOpen = ref(false);

const value = defineModel<T>({ required: true });

defineProps<{
  choices: readonly Choice[];
}>();

const layerButton = ref<HTMLButtonElement>();
const layerPicker = ref<HTMLDivElement>();

const cancelClickOnClickOutside = false;

const onClickOutside = (e: MouseEvent) => {
  if (!clickedOpen.value) return;
  const elements = [layerButton.value, layerPicker.value];
  const target = e.target;
  if (target instanceof Node && elements.some((element) => element?.contains(target))) {
    // Click within
    return;
  } else {
    clickedOpen.value = false;
    e.stopPropagation();
  }
};

onMounted(() => {
  window.addEventListener('click', onClickOutside, { capture: cancelClickOnClickOutside });
});

onUnmounted(() => {
  window.removeEventListener('click', onClickOutside, { capture: cancelClickOnClickOutside });
});
</script>

<template>
  <button ref="layerButton" class="layer-button" @click="clickedOpen = !clickedOpen">
    <UIIcon>layers</UIIcon>
  </button>
  <div ref="layerPicker" class="layer-picker" :class="{ open: clickedOpen }">
    <menu>
      <li v-for="choice of choices" :key="choice.value" :aria-selected="value === choice.value">
        <a
          @click.prevent="
            value = choice.value;
            clickedOpen = false;
          "
        >
          {{ choice.label }}
        </a>
      </li>
    </menu>
  </div>
</template>

<style lang="scss">
.mapboxgl-ctrl:has(.layer-picker) {
  position: relative;
}

.layer-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.layer-picker {
  position: absolute;
  right: 100%;
  top: 0;
  width: max-content;

  .mapboxgl-ctrl:not(:hover) &:not(.open) {
    display: none;
  }

  menu {
    background: var(--background);
    border-radius: 0.5rem;
    overflow: hidden;
    list-style: none;
    margin: 0;
    margin-right: 0.5rem;
    padding: 0.5rem 0;

    li {
      &:hover {
        background-color: var(--background-slight);
      }

      &[aria-selected='true'] {
        background-color: var(--background-strong);
      }

      a {
        padding-inline: 1rem;
        display: block;
        cursor: pointer;
        color: inherit;
      }
    }
  }
}
</style>
