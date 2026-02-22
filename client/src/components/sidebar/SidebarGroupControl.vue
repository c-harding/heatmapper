<script setup lang="ts">
import { computed } from 'vue';

import { GroupLevel, useActivityStore } from '@/stores/ActivityStore';

import UIVerticalTab from '../ui/tabs/UIVerticalTab.vue';
import { type Tab } from '../ui/tabs/UIVerticalTabContainer.vue';
import UIDropdown from '../ui/UIDropdown.vue';
import controlsStyle from './controls.module.scss';

defineProps<{ tab: Tab<string> }>();

const activityStore = useActivityStore();

const groupLevels = [
  { value: GroupLevel.OFF, label: 'None', summary: 'disabled' },
  { value: GroupLevel.WEEKLY_MO, label: 'Week (Mon–Sun)', summary: 'by week (Mon–Sun)' },
  { value: GroupLevel.WEEKLY_SA, label: 'Week (Sat–Fri)', summary: 'by week (Sat–Fri)' },
  { value: GroupLevel.WEEKLY_SU, label: 'Week (Sun–Sat)', summary: 'by week (Sun–Sat)' },
  { value: GroupLevel.MONTHLY, label: 'Month', summary: 'by month' },
  { value: GroupLevel.YEARLY, label: 'Year', summary: 'by year' },
];

const summary = computed(
  () =>
    (groupLevels.find((level) => level.value === activityStore.groupLevel) ?? groupLevels[0])
      .summary,
);
</script>

<template>
  <UIVerticalTab :tab icon="segment" :summary="summary" heading="Grouping">
    <template #expanded>
      <div :class="controlsStyle.grid">
        <label>
          <span>Group by</span>
          <UIDropdown v-model="activityStore.groupLevel" :options="groupLevels" />
        </label>
      </div>
    </template>
  </UIVerticalTab>
</template>
