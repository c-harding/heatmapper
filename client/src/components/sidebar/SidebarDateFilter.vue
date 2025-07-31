<script setup lang="ts">
import { computed } from 'vue';

import { formatDate, formatDateRange } from '@/utils/numberFormat';

import UIVerticalTab from '../ui/tabs/UIVerticalTab.vue';
import { type Tab } from '../ui/tabs/UIVerticalTabContainer.vue';
import UIDateInput from '../ui/UIDateInput.vue';
import controlsStyle from './controls.module.scss';

defineProps<{ tab: Tab<string> }>();

const start = defineModel<Date>('start');
const end = defineModel<Date>('end');

function reset() {
  start.value = undefined;
  end.value = undefined;
}

const summary = computed(() => {
  // The end date, or undefined if in the future
  const effectiveEnd = end.value && (end.value > new Date() ? undefined : end.value);
  if (start.value && effectiveEnd) {
    return formatDateRange(start.value, effectiveEnd);
  } else if (start.value) {
    return `After ${formatDate(start.value)}`;
  } else if (effectiveEnd) {
    return `Before ${formatDate(effectiveEnd)}`;
  } else {
    return 'All dates';
  }
});
</script>

<template>
  <UIVerticalTab
    :tab
    icon="date_range"
    heading="Dates"
    :summaryItems="[summary]"
    :resetDisabled="!start && !end"
    @reset="reset"
  >
    <template #expanded>
      <div :class="[controlsStyle.grid, controlsStyle.center]">
        <label>
          <span>Start date</span>
          <UIDateInput v-model="start" name="start" />
        </label>
        <label>
          <span>End date</span>
          <UIDateInput v-model="end" name="end" />
        </label>
      </div>
    </template>
  </UIVerticalTab>
</template>

<style lang="scss" module>
.content {
  display: flex;
  flex-direction: column;
}

.noPointer {
  pointer-events: none;

  > * {
    pointer-events: initial;
    margin-right: auto;
  }
}
</style>
