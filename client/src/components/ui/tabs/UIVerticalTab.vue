<script setup lang="ts" generic="T extends string">
import { computed } from 'vue';

import UIButton from '../UIButton.vue';
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
  resetDisabled?: boolean;
  showSummaryWhenExpanded?: boolean;
  onHelp?: () => void;
  onReset?: () => void;
}>();

defineSlots<{
  icon(): unknown;
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
  <div :class="[style.uiVerticalTab, tab.isOpen && style.selected]">
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
          <UIButton
            v-if="onHelp && tab.isOpen"
            :class="[style.topRightButton, style.helpButton]"
            ghost
            icon="help"
            @click="onHelp()"
          />
          <UIButton
            v-if="onReset && tab.isOpen"
            :disabled="resetDisabled"
            :class="style.topRightButton"
            ghost
            icon="settings_backup_restore"
            @click="onReset()"
          />
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
        <span v-if="showSummaryWhenExpanded" :class="style.summary">
          <slot name="summary">
            <UIUnbrokenList :items="summary.items">{{ summary.fallback }}</UIUnbrokenList>
          </slot>
        </span>
        <slot name="expanded" :toggle="tab.toggle" />
      </div>
    </details>
  </div>
</template>
