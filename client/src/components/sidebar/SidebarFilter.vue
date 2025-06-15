<script setup lang="ts">
import { computed } from 'vue';

import { useActivityService } from '@/services/useActivityService';
import useSportsTypes from '@/services/useSportsTypes';

import UIVerticalTab from '../ui/tabs/UIVerticalTab.vue';
import UIVerticalTabContainer from '../ui/tabs/UIVerticalTabContainer.vue';
import UIButton from '../ui/UIButton.vue';
import UIDropdown from '../ui/UIDropdown.vue';
import controlsStyle from './controls.module.scss';

const { useRoutes, filterModel } = useActivityService();

const { sportsDropdownOptions, sportsFilter } = useSportsTypes();

const chosenSportLabel = computed(() => {
  if (sportsFilter.value) {
    for (const optionGroup of sportsDropdownOptions.value) {
      for (const option of optionGroup) {
        if (option.value === sportsFilter.value) return option.label;
      }
    }
  }
  return undefined;
});

const filterSummary = computed(
  () =>
    [
      chosenSportLabel.value,
      useRoutes &&
        filterModel.starred !== undefined &&
        (filterModel.starred ? 'only starred' : 'only unstarred'),
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
              v-model="sportsFilter"
              :options="sportsDropdownOptions"
              blankValue=""
              blankLabel="All sports"
            />
          </label>
          <label
            v-if="useRoutes"
            title="Only show starred routes (double-click for unstarred routes)"
          >
            <span>Starred</span>
            <UIButton
              :invertColor="filterModel.starred === false"
              :icon="filterModel.starred === undefined ? 'star_border' : 'star'"
              @click="filterModel.starred = filterModel.starred !== undefined ? undefined : true"
              @dbl-click="filterModel.starred = false"
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
