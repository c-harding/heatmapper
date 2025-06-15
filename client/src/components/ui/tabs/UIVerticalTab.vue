<script setup lang="ts" generic="T extends string">
import UIIcon from '../UIIcon.vue';
import style from './tab.module.scss';
import { type Tab } from './UIVerticalTabContainer.vue';

defineProps<{
  icon?: string;
  tab: Tab<T>;
  contentClass?: unknown;
}>();
</script>

<template>
  <div :class="style.subgrid">
    <div :class="[style.tab, tab.isOpen && style.selected]">
      <button :class="style.button" @click="tab.toggle">
        <slot name="icon"><UIIcon :icon inline /></slot>
      </button>
    </div>

    <div :class="[style.content, contentClass]">
      <slot :isOpen="tab.isOpen" :toggle="tab.toggle" :select="tab.select">
        <slot v-if="tab.isOpen" name="expanded" :toggle="tab.toggle" />
        <slot v-else name="summary" :select="tab.select" />
      </slot>
    </div>
  </div>
</template>
