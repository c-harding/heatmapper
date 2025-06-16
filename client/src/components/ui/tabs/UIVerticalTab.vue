<script setup lang="ts" generic="T extends string">
import UIIcon from '../UIIcon.vue';
import style from './tab.module.scss';
import { type Tab } from './UIVerticalTabContainer.vue';

defineProps<{
  icon?: string;
  tab: Tab<T>;
  expandedContentClass?: unknown;
  heading?: string;
  summary?: string;
}>();
</script>

<template>
  <div :class="[style.uiVerticalTab, tab.isOpen && style.selected]">
    <div :class="style.tab">
      <button :class="style.button" :title="heading" @click="tab.toggle">
        <div :class="style.buttonContent">
          <slot name="icon"><UIIcon :icon inline /></slot>
        </div>
      </button>
    </div>

    <div :class="[style.content]">
      <slot :isOpen="tab.isOpen" :toggle="tab.toggle" :select="tab.select">
        <slot v-if="tab.isOpen" name="expanded" :toggle="tab.toggle">
          <h2 v-if="heading" :class="style.heading">{{ heading }}</h2>
          <div :class="expandedContentClass">
            <slot v-if="tab.isOpen" name="expandedContent" :toggle="tab.toggle" />
          </div>
        </slot>
        <slot v-else name="summary" :select="tab.select">
          <div :class="style.summaryRow" @click="tab.select()">
            <span v-if="heading" :class="style.heading">{{ heading }}</span
            >{{ ' ' }}
            <span :class="style.summary">
              <slot name="styledSummary" :select="tab.select">{{ summary }}</slot>
            </span>
          </div>
        </slot>
      </slot>
    </div>
  </div>
</template>
