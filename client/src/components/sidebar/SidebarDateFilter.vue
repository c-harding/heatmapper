<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { formatDate, formatDateRange } from '@/utils/numberFormat';

import UIVerticalTab from '../ui/tabs/UIVerticalTab.vue';
import { type Tab } from '../ui/tabs/UIVerticalTabContainer.vue';
import UIButton from '../ui/UIButton.vue';
import UIDateInput from '../ui/UIDateInput.vue';
import UIMultiText from '../ui/UIMultiText.vue';
import controlsStyle from './controls.module.scss';

defineProps<{ tab: Tab<string> }>();

const start = defineModel<Date>('start');
const end = defineModel<Date>('end');

const isActive = computed(() => !!start.value || !!end.value);

const previousDates = ref<{ start?: Date; end?: Date }>();

// Dates chosen since the clear replace it, so that emptying them again does not offer it back
watch(isActive, (active) => {
  if (active) previousDates.value = undefined;
});

const clearState = computed(() =>
  isActive.value ? 'clear' : previousDates.value ? 'undo' : 'initial',
);

function clearOrRestore() {
  if (isActive.value) {
    previousDates.value = { start: start.value, end: end.value };
    start.value = undefined;
    end.value = undefined;
  } else {
    start.value = previousDates.value?.start;
    end.value = previousDates.value?.end;
  }
}

const summary = computed(() => {
  // The end date, or undefined if in the future
  const effectiveEnd = end.value && (end.value > new Date() ? undefined : end.value);
  if (start.value && effectiveEnd) {
    return formatDateRange(+start.value, +effectiveEnd);
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
  <UIVerticalTab :tab icon="date_range" heading="Dates" :summary="[summary]" :isActive>
    <template #meta>
      <UIButton
        ghost
        :disabled="clearState === 'initial'"
        :icon="clearState === 'undo' ? 'undo' : 'delete'"
        @click="clearOrRestore"
      >
        <UIMultiText
          :texts="{ clear: 'Clear', undo: 'Undo' }"
          :selected="clearState === 'undo' ? 'undo' : 'clear'"
        />
      </UIButton>
    </template>
    <template #expanded>
      <div :class="controlsStyle.grid">
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
    margin-inline-end: auto;
  }
}
</style>
