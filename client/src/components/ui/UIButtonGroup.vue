<script setup lang="ts"></script>

<template>
  <div class="button-group">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.button-group {
  display: flex;
  margin: 0.5rem;

  :slotted(button) {
    margin: 0;

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
