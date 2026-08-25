<script setup lang="ts" generic="T extends string">
import { computed } from 'vue';

import UIIcon from '../UIIcon.vue';
import UIUnbrokenList from '../UIUnbrokenList.vue';
import style from './tab.module.scss';
import { type Tab } from './UIVerticalTabContainer.vue';

const {
  tab,
  summary: rawSummary,
  summaryEmpty,
} = defineProps<{
  icon?: string;
  tab: Tab<T>;
  expandedContentClass?: unknown;
  heading?: string;
  summary?: string | string[];
  summaryEmpty?: string;
  /** True when the tab holds something other than its default. */
  isActive?: boolean;
}>();

defineSlots<{
  icon(): unknown;
  /** Buttons acting on the whole tab, shown beside its heading while it is open. */
  meta(): unknown;
  default(props: { isOpen: boolean; toggle(): void; select(): void }): unknown;
  summary(props: { select?: () => void }): unknown;
  expanded(props: { toggle(): void }): unknown;
}>();

function preventIfSelected(event: MouseEvent) {
  if (window.getSelection()?.type === 'Range') {
    event.preventDefault();
  }
}

function onToggle(event: ToggleEvent) {
  tab.setOpen(event.newState === 'open');
}

const summary = computed(() =>
  typeof rawSummary === 'string'
    ? { items: [], fallback: rawSummary }
    : { items: rawSummary, fallback: summaryEmpty },
);
</script>

<template>
  <div :class="[style.uiVerticalTab, tab.isOpen && style.selected, isActive && style.active]">
    <div :class="style.tab">
      <button :class="style.button" :title="heading" @click="tab.toggle()">
        <div :class="style.buttonContent">
          <slot name="icon"><UIIcon :icon inline /></slot>
        </div>
      </button>
    </div>

    <details :class="[style.content]" :open="tab.isOpen" @toggle="onToggle">
      <summary :class="style.summaryRow" @click="preventIfSelected">
        <slot :isOpen="tab.isOpen" :toggle="tab.toggle" :select="tab.select">
          <span v-if="tab.isOpen" :class="style.meta"><slot name="meta" /></span>
          <span v-if="heading" :class="style.heading">{{ heading }}</span>
          {{ ' ' }}
          <span v-if="!tab.isOpen" :class="style.summary">
            <slot name="summary" :select="tab.select">
              <UIUnbrokenList :items="summary.items">{{ summary.fallback }}</UIUnbrokenList>
            </slot>
          </span>
        </slot>
      </summary>
      <div :class="expandedContentClass">
        <slot name="expanded" :toggle="tab.toggle" />
      </div>
    </details>
  </div>
</template>
