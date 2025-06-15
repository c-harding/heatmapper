<script setup lang="ts">
import { computed } from 'vue';

import { useActivityStore } from '@/stores/ActivityStore';
import { useSportTypeStore } from '@/stores/SportTypeStore';

import UIVerticalTab from '../ui/tabs/UIVerticalTab.vue';
import UIVerticalTabContainer from '../ui/tabs/UIVerticalTabContainer.vue';
import UIButton from '../ui/UIButton.vue';
import UIDropdown from '../ui/UIDropdown.vue';
import controlsStyle from './controls.module.scss';

const activityStore = useActivityStore();

const sportTypeStore = useSportTypeStore();

const chosenSportLabel = computed(() => {
  if (sportTypeStore.filter) {
    for (const optionGroup of sportTypeStore.dropdownOptions) {
      for (const option of optionGroup) {
        if (option.value === sportTypeStore.filter) return option.label;
      }
    }
  }
  return undefined;
});

const filterSummary = computed(
  () =>
    [
      chosenSportLabel.value,
      activityStore.useRoutes &&
        activityStore.filterModel.starred !== undefined &&
        (activityStore.filterModel.starred ? 'only starred' : 'only unstarred'),
    ]
      .filter((string): string is string => !!string)
      .join(', ') || 'No filter',
);
</script>

<template>
  <UIVerticalTabContainer v-slot="{ makeTab }">
    <UIVerticalTab :tab="makeTab('filter')" icon="filter_alt" :contentClass="$style.content">
      <template #summary="{ select }">
        <div :class="$style.summary" @click="select">
          {{ filterSummary }}
        </div>
      </template>
      <template #expanded>
        <div :class="controlsStyle.grid">
          <label :class="controlsStyle.expand">
            <span>Sport type</span>
            <UIDropdown
              v-model="sportTypeStore.filter"
              :options="sportTypeStore.dropdownOptions"
              blankValue=""
              blankLabel="All sports"
            />
          </label>
          <label
            v-if="activityStore.useRoutes"
            title="Only show starred routes (double-click for unstarred routes)"
          >
            <span>Starred</span>
            <UIButton
              :invertColor="activityStore.filterModel.starred === false"
              :icon="activityStore.filterModel.starred === undefined ? 'star_border' : 'star'"
              @click="
                activityStore.filterModel.starred =
                  activityStore.filterModel.starred !== undefined ? undefined : true
              "
              @dbl-click="activityStore.filterModel.starred = false"
            />
          </label>
        </div>
      </template>
    </UIVerticalTab>
  </UIVerticalTabContainer>
</template>

<style lang="scss" module>
.content {
  display: flex;
  flex-direction: column;
}

.summary {
  font-size: 0.9em;
  font-style: italic;
}
</style>
