<script setup lang="ts">
import { computed } from 'vue';

import { useActivityStore } from '@/stores/ActivityStore';

import UIVerticalTab from '../ui/tabs/UIVerticalTab.vue';
import { type Tab } from '../ui/tabs/UIVerticalTabContainer.vue';
import UICheckbox from '../ui/UICheckbox.vue';

defineProps<{ tab: Tab<string> }>();

const activityStore = useActivityStore();

const summary = computed(() =>
  [
    activityStore.useRoutes &&
      activityStore.displayOptions.showActivities &&
      'show past activities',
  ].filter((string): string is string => !!string),
);

function reset() {
  activityStore.displayOptions.showActivities = false;
}
</script>

<template>
  <UIVerticalTab
    v-if="activityStore.useRoutes"
    :tab
    icon="visibility"
    heading="Display"
    :summary
    :resetDisabled="!activityStore.displayOptions.showActivities"
    @reset="reset"
  >
    <template #expanded>
      <UICheckbox
        v-model="activityStore.displayOptions.showActivities"
        title="Show past activities as a background layer"
        :iconScale="0.8"
      >
        Show past activities
      </UICheckbox>
    </template>
  </UIVerticalTab>
</template>
