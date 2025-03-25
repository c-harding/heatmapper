<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import UIIcon from './UIIcon.vue';

const open = defineModel<boolean>({ default: false });

const modal = ref<HTMLDialogElement>();

const mountedPromise = new Promise<void>((resolve) => {
  onMounted(resolve);
});

watch(
  open,
  async (isOpen) => {
    await mountedPromise;
    if (isOpen) {
      modal.value?.showModal();
    } else {
      modal.value?.close();
    }
  },
  { immediate: true },
);
</script>

<template>
  <dialog ref="modal" :class="$style.uiModal" @close="open = false" @click="open = false">
    <a :class="$style.closeButton" @click.stop.prevent="open = false"><UIIcon icon="close" /></a>
    <div :class="$style.dialogContents" @click.stop>
      <slot v-if="open" />
    </div>
  </dialog>
</template>

<style module lang="scss">
dialog.uiModal {
  border: none;
  padding: 0;
  border-radius: 1rem;
  position: relative;

  background-color: var(--background-full);
  color: var(--color-full);
  overflow: visible;

  filter: drop-shadow(0 1em 2em color-mix(in srgb, var(--color-full) 10%, transparent));

  &::backdrop {
    background-color: color-mix(in srgb, var(--color-full) 10%, transparent);
  }

  .closeButton {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    color: var(--color-strong);

    &:hover {
      color: var(--bold-color);
    }
  }

  .dialogContents {
    margin-block: 1em;
    padding-inline: 1em;
  }
}
</style>
