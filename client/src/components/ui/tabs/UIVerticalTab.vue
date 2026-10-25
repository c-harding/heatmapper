<script setup lang="ts" generic="T extends string">
import { computed, useId } from 'vue';

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
  expanded(props: { toggle(): void }): unknown;
}>();

const contentId = useId();

const summary = computed(() =>
  typeof rawSummary === 'string'
    ? { items: [], fallback: rawSummary }
    : { items: rawSummary, fallback: summaryEmpty },
);
</script>

<template>
  <section
    :class="[style.uiVerticalTab, tab.isOpen && style.selected, isActive && style.active]"
    :aria-label="heading"
  >
    <div :class="style.tab">
      <button :class="style.button" :title="heading" @click="tab.toggle()">
        <div :class="style.buttonContent">
          <slot name="icon"><UIIcon :icon inline /></slot>
        </div>
      </button>
    </div>

    <div :class="style.content">
      <div :class="style.summaryRow">
        <button
          type="button"
          :class="style.headerButton"
          :aria-expanded="tab.isOpen"
          :aria-controls="contentId"
          @click="tab.toggle()"
        >
          <span v-if="heading" :class="style.heading">{{ heading }}</span>
          <span v-if="!tab.isOpen" :class="style.summary">
            <UIUnbrokenList :items="summary.items">{{ summary.fallback }}</UIUnbrokenList>
          </span>
        </button>
        <!-- Beside the button rather than in it, where a screen reader would read them as its name -->
        <span v-if="tab.isOpen" :class="style.meta"><slot name="meta" /></span>
      </div>
      <!-- Searchable while closed: a find-in-page match fires beforematch, which opens the tab.
           Bare, as a class setting display would undo hidden where until-found is unknown -->
      <div
        :id="contentId"
        :hidden="tab.isOpen ? undefined : 'until-found'"
        @beforematch="tab.select()"
      >
        <div :class="expandedContentClass">
          <slot name="expanded" :toggle="tab.toggle" />
        </div>
      </div>
    </div>
  </section>
</template>
