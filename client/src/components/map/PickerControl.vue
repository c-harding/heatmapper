<script setup lang="ts" generic="T extends string">
import { onUnmounted, ref, watch } from 'vue';

import UIIcon from '../ui/UIIcon.vue';
import UILabelledIcon from '../ui/UILabelledIcon.vue';
import UIMultiText from '../ui/UIMultiText.vue';

export interface DropdownVariant<T> {
  readonly value: T;
  readonly icon: string;
  readonly label: string;
}

export interface DropdownChoice<T> {
  readonly value: T;
  readonly label: string;
  readonly variants?: readonly DropdownVariant<T>[];
}

type Choice = DropdownChoice<T>;

const clickedOpen = ref(false);

const value = defineModel<T>({ required: true });

const { choices } = defineProps<{
  choices: readonly Choice[];
}>();

const layerButton = ref<HTMLButtonElement>();
const layerPicker = ref<HTMLDivElement>();

const cancelClickOnClickOutside = false;

const onClickOutside = (e: MouseEvent) => {
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

watch(clickedOpen, (isOpen) => {
  if (isOpen) {
    window.addEventListener('click', onClickOutside, { capture: cancelClickOnClickOutside });
  } else {
    window.removeEventListener('click', onClickOutside, { capture: cancelClickOnClickOutside });
  }
});

onUnmounted(() => {
  window.removeEventListener('click', onClickOutside, { capture: cancelClickOnClickOutside });
});

function pick(choice: T) {
  value.value = choice;
  clickedOpen.value = false;
}

function isActive(choice: Choice): boolean {
  return (
    value.value === choice.value || (choice.variants?.some((v) => v.value === value.value) ?? false)
  );
}
</script>

<template>
  <button ref="layerButton" :class="$style.layerButton" @click="clickedOpen = !clickedOpen">
    <UIIcon icon="layers" />
  </button>
  <div ref="layerPicker" :class="[$style.layerPicker, clickedOpen && $style.open]">
    <menu>
      <li v-for="choice of choices" :key="choice.value" :class="$style.row">
        <a :class="$style.name" @click.prevent="pick(choice.value)">
          <span :class="$style.nameInner">
            <UILabelledIcon :icon="isActive(choice) ? 'check' : ' '">
              <!-- Rendered at both weights to reserve the bold width. -->
              <UIMultiText :selected="value === choice.value ? 'bold' : 'normal'">
                <template #normal
                  ><span>{{ choice.label }}</span></template
                >
                <template #bold
                  ><b>{{ choice.label }}</b></template
                >
              </UIMultiText>
            </UILabelledIcon>
          </span>
        </a>
        <div v-if="choice.variants" :class="$style.variants">
          <button
            v-for="variant of choice.variants"
            :key="variant.value"
            type="button"
            :class="[$style.variant, { [$style.variantOn]: value === variant.value }]"
            :title="variant.label"
            :aria-label="variant.label"
            @click.prevent="pick(variant.value)"
          >
            <span :class="$style.variantIcon"><UIIcon :icon="variant.icon" inline /></span>
          </button>
        </div>
      </li>
    </menu>
  </div>
</template>

<style module lang="scss">
:global(.mapboxgl-ctrl):has(> .layerPicker) {
  position: relative;
}

.layerButton {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.layerPicker {
  position: absolute;
  right: 0;
  padding-right: 100%;
  top: 0;
  width: max-content;

  :global(.mapboxgl-ctrl):not(:hover) &:not(.open) {
    display: none;
  }

  menu {
    background: var(--background-full);
    border-radius: 1rem;
    overflow: hidden;
    list-style: none;
    margin: 0;
    margin-right: 0.5rem;
    padding: 0.5rem 0; // no horizontal padding: row targets reach the menu edges

    .row {
      display: flex;
      align-items: stretch;
      color: inherit;

      // hit target; the inset highlight is .nameInner
      .name {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        align-items: stretch;
        cursor: pointer;
        color: inherit;
        text-decoration: none;
      }

      .nameInner {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 1.6rem; // match the variant square, so grouped and plain rows are one height
        display: flex;
        align-items: center;
        margin-left: 0.5rem;
        border-radius: 0.5rem;
        padding: 0.05rem 0.5rem;
      }

      .name:hover .nameInner {
        background-color: var(--background-strong);
      }

      // plain rows: keep the highlight off the right edge
      &:not(:has(.variants)) .nameInner {
        margin-right: 0.5rem;
      }

      .variants {
        display: flex;
        align-items: stretch;
        flex: none;
      }

      // hit target reaching the edge; the inset square highlight is .variantIcon
      .variant {
        appearance: none;
        border: none;
        margin: 0;
        padding: 0;
        background: none;
        color: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        &:last-child {
          padding-right: 0.5rem;
        }

        .variantIcon {
          width: 1.6rem;
          height: 1.6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          color: var(--color-weak);
        }

        // hover tints only; the darker glyph marks the set variant
        &:hover .variantIcon {
          background-color: var(--background-strong);
        }

        &.variantOn .variantIcon {
          background-color: var(--background-strong);
          color: var(--color-full);
        }
      }

      @media (pointer: coarse) {
        .nameInner {
          min-height: 44px;
        }

        .variantIcon {
          width: 44px;
          height: 44px;
        }
      }
    }
  }
}
</style>
