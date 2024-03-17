<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import UIIcon from './UIIcon.vue';

const open = defineModel<boolean>({ default: false });

const modal = ref<HTMLDialogElement>();

const mountedPromise = new Promise<void>((resolve) => onMounted(resolve));

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
  <dialog ref="modal" @close="open = false" @click="open = false">
    <a class="close-button" @click.stop.prevent="open = false"><UIIcon>close</UIIcon></a>
    <div class="dialog-contents" @click.stop>
      <slot v-if="open" />
    </div>
  </dialog>
</template>

<style lang="scss">
dialog {
  border: none;
  padding: 0;
  border-radius: 1rem;
  position: relative;

  background-color: var(--background);
  color: var(--color);
  overflow: visible;

  filter: drop-shadow(0 1em 2em color-mix(in srgb, var(--color) 10%, transparent));

  &::backdrop {
    background-color: color-mix(in srgb, var(--color) 10%, transparent);
  }

  .close-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    color: var(--color-slight);

    &:hover {
      color: var(--bold-color);
    }
  }

  .dialog-contents {
    margin-block: 1em;
    padding-inline: 1em;
  }
}
</style>
