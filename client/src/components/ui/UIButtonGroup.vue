<script setup lang="ts"></script>

<template>
  <div :class="$style.buttonGroup">
    <slot />
  </div>
</template>

<style module lang="scss">
.buttonGroup {
  display: flex;
  margin: 0.5rem;

  > button {
    margin: 0;

    position: relative;

    &:not(:disabled) {
      z-index: 1;
    }

    &:not(:first-child) {
      --button-border-radius-left: 0;
      margin-left: -1px;
    }
    &:not(:last-child) {
      --button-border-radius-right: 0;
    }
  }
}
</style>
