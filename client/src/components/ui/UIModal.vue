<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';

import UIIcon from './UIIcon.vue';

const open = defineModel<boolean>({ default: false });

defineProps<{ heading?: string }>();

const modal = ref<HTMLDialogElement>();
const contents = ref<HTMLDivElement>();

const CONTROL =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), ' +
  'textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

const mountedPromise = new Promise<void>((resolve) => {
  onMounted(resolve);
});

watch(
  open,
  async (isOpen) => {
    await mountedPromise;
    if (isOpen) {
      modal.value?.showModal();
      await nextTick();
      contents.value?.querySelector<HTMLElement>(CONTROL)?.focus();
    } else {
      modal.value?.close();
    }
  },
  { immediate: true },
);
</script>

<template>
  <dialog ref="modal" :class="$style.uiModal" @close="open = false" @click="open = false">
    <h2 :class="$style.heading" @click.stop>
      <slot v-if="open" name="heading">{{ heading }}</slot>
    </h2>
    <div ref="contents" :class="$style.dialogContents" @click.stop>
      <slot v-if="open" />
    </div>
    <!-- Last, so that opening focuses the contents first -->
    <button type="button" :class="$style.closeButton" aria-label="Close" @click.stop="open = false">
      <UIIcon icon="close" />
    </button>
  </dialog>
</template>

<style module lang="scss">
dialog.uiModal {
  border: none;
  padding: 0;
  border-radius: var(--surface-border-radius);
  position: relative;
  flex-direction: column;

  &:open {
    display: flex;
  }

  background-color: var(--background-full);
  color: var(--color-full);
  overflow: visible;

  filter: drop-shadow(0 1em 2em color-mix(in srgb, var(--color-full) 10%, transparent));

  &::backdrop {
    background-color: color-mix(in srgb, var(--color-full) 10%, transparent);
  }

  .closeButton {
    // The padding is the hit area; the offset keeps the cross in the corner
    $inset: 0.5rem;
    $padding: 10px; // a 24px glyph plus twice this is 44px

    all: unset;
    position: absolute;
    top: calc($inset - $padding);
    inset-inline-end: calc($inset - $padding);
    padding: $padding;
    display: flex;
    cursor: pointer;
    color: var(--color-strong);

    &:hover {
      color: var(--bold-color);
    }

    &:focus-visible {
      color: AccentColor;
      border-radius: 50%;
      outline: 2px solid AccentColor;
      outline-offset: -6px;
    }
  }

  .heading {
    margin: 0;
    padding-top: 1rem;
    padding-inline-start: 1rem;
    // Enough to clear the close button
    padding-inline-end: 3rem;
    padding-bottom: 0;
  }

  .dialogContents {
    padding: 1em;
    overflow-block: auto;

    > :first-child {
      margin-top: 0;
    }
  }
}
</style>
