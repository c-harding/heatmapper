<script setup lang="ts">
import LoginPrompt from './LoginPrompt.vue';

const { reconnect = false } = defineProps<{
  reconnect?: boolean;
}>();

const emit = defineEmits<{
  login: [keepSignedIn: boolean];
}>();
</script>

<!-- The login prompt as the sidebar shows it, in a box at its foot -->
<template>
  <div :class="$style.notLoggedInContainer">
    <LoginPrompt :class="$style.notLoggedIn" :reconnect @login="emit('login', $event)" />
  </div>
</template>

<style module lang="scss">
.notLoggedInContainer {
  background-color: var(--background-full);
  padding: 1em;
  position: sticky;
  bottom: 1em;
  z-index: 3; // opaque footer: sit above the z-indexed controls it can overlap

  .notLoggedIn {
    background-color: var(--background-weak);
    border-radius: var(--surface-border-radius);
    padding: 1em;
  }
}
</style>
