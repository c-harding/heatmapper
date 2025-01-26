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
  display: relative;

  > button {
    margin: 0;

    display: relative;

    &:focus {
      z-index: 1;
    }

    &:not(:first-child) {
      border-start-start-radius: 0;
      border-end-start-radius: 0;
      margin-left: -1px;
    }
    &:not(:last-child) {
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }
  }
}
</style>
