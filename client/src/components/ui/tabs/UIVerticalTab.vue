<script setup lang="ts" generic="T extends string">
import UIButton from '../UIButton.vue';
import UIIcon from '../UIIcon.vue';
import style from './tab.module.scss';
import { type Tab } from './UIVerticalTabContainer.vue';

const { tab } = defineProps<{
  icon?: string;
  tab: Tab<T>;
  expandedContentClass?: unknown;
  heading?: string;
  summary?: string;
  resetDisabled?: boolean;
  onHelp?: () => void;
  onReset?: () => void;
}>();

function preventIfSelected(event: MouseEvent) {
  if (window.getSelection()?.type === 'Range') {
    event.preventDefault();
  }
}

function onToggle(event: ToggleEvent) {
  tab.setOpen(event.newState === 'open');
}
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
            :class="style.helpButton"
            ghost
            icon="help"
            @click="onHelp()"
          />
          <UIButton
            v-if="onReset && tab.isOpen"
            :disabled="resetDisabled"
            :class="style.resetButton"
            ghost
            icon="settings_backup_restore"
            @click="onReset()"
          />
          <span v-if="heading" :class="style.heading">{{ heading }}</span>
          {{ ' ' }}
          <span v-if="!tab.isOpen" :class="style.summary">
            <slot name="summary" :select="tab.select">{{ summary }}</slot>
          </span>
        </slot>
      </summary>
      <div :class="expandedContentClass">
        <slot name="expanded" :toggle="tab.toggle" />
      </div>
    </details>
  </div>
</template>
