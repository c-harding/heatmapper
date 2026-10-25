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
  // Between the border and everything in the dialog, the heading included
  $edge: 1.5rem;
  // The close button's glyph, and the padding around it that makes up the rest of its hit area:
  // more on the sides at the dialog's edges, keeping the glyph away from the corner
  $close-glyph: 32px;
  $close-padding: 10px;
  $close-padding-edge: 20px;

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
    all: unset;
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    padding-block: $close-padding-edge $close-padding;
    padding-inline: $close-padding $close-padding-edge;
    display: flex;
    cursor: pointer;
    color: var(--color-strong);

    i {
      font-size: $close-glyph;
    }

    &:hover {
      color: var(--bold-color);
    }

    &:focus-visible {
      // The browser's own ring, which all: unset dropped
      outline: revert;
      border-radius: 50%;
      outline-offset: -6px;
    }
  }

  .heading {
    margin: 0;
    padding-top: $edge;
    padding-inline-start: $edge;
    // Enough to clear the close button
    padding-inline-end: calc($close-padding + $close-glyph + $close-padding-edge);
    padding-bottom: 0;
  }

  .dialogContents {
    padding: $edge;
    overflow-block: auto;

    > :first-child {
      margin-top: 0;
    }
  }
}
</style>
