<script setup lang="ts">
import { computed, ref } from 'vue';

import { type FilterModel, type RangeFilter, useActivityStore } from '@/stores/ActivityStore';
import { useSportTypeStore } from '@/stores/SportTypeStore';
import { formatKilometers, formatMeters } from '@/utils/numberFormat';

import UIVerticalTab from '../ui/tabs/UIVerticalTab.vue';
import UIVerticalTabContainer from '../ui/tabs/UIVerticalTabContainer.vue';
import UIButton from '../ui/UIButton.vue';
import UIButtonGroup from '../ui/UIButtonGroup.vue';
import UIDropdown from '../ui/UIDropdown.vue';
import UIMultiText from '../ui/UIMultiText.vue';
import UIRange from '../ui/UIRange.vue';
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

const blankFilter = Object.freeze<FilterModel>({
  distance: undefined,
  elevation: undefined,
  sportType: undefined,
  starred: undefined,
});

function compareRanges(rangeA: RangeFilter | undefined, rangeB: RangeFilter | undefined) {
  return rangeA?.max === rangeB?.max && rangeA?.min === rangeB?.min;
}

function compareFilters(filterA: FilterModel, filterB: FilterModel) {
  return (
    (filterA.sportType ?? '') === (filterB.sportType ?? '') &&
    filterA.starred === filterB.starred &&
    compareRanges(filterA.distance, filterB.distance) &&
    compareRanges(filterA.elevation, filterB.elevation)
  );
}

const previousFilters = ref<FilterModel>();

const filterState = computed<'changed' | 'canUndo' | 'initial'>(() => {
  if (!compareFilters(activityStore.filterModel, blankFilter)) return 'changed';
  else if (previousFilters.value) return 'canUndo';
  else return 'initial';
});

function revertFilter() {
  if (!compareFilters(activityStore.filterModel, blankFilter)) {
    previousFilters.value = { ...activityStore.filterModel };
    Object.assign(activityStore.filterModel, blankFilter);
  } else {
    Object.assign(activityStore.filterModel, previousFilters.value);
  }
}

function formatRange(
  range: RangeFilter | undefined,
  label: string,
  format: (value: number) => string,
): string | undefined {
  if (range?.min && range?.max) return `${format(range.min)} ≤ ${label} ≤ ${format(range.max)}`;
  if (range?.min) return `${label} ≥ ${format(range.min)}`;
  if (range?.max) return `${label} ≤ ${format(range.max)}`;
  return undefined;
}

const filterSummary = computed(() =>
  [
    chosenSportLabel.value,
    formatRange(activityStore.filterModel.distance, 'distance', formatKilometers),
    formatRange(activityStore.filterModel.elevation, 'elevation', formatMeters),
    activityStore.useRoutes &&
      activityStore.filterModel.starred !== undefined &&
      (activityStore.filterModel.starred ? 'only starred' : 'only unstarred'),
  ].filter((string): string is string => !!string),
);
</script>

<template>
  <UIVerticalTabContainer v-slot="{ makeTab }">
    <UIVerticalTab :tab="makeTab('filter')" icon="filter_alt" :contentClass="$style.content">
      <template #summary="{ select }">
        <div :class="$style.summary" @click="select">
          <template v-for="(summaryItem, i) of filterSummary" :key="i"
            ><span>{{ summaryItem }}</span
            ><template v-if="i + 1 < filterSummary.length">, </template></template
          >
          <template v-if="!filterSummary.length">No filter set</template>
        </div>
      </template>
      <template #expanded>
        <div :class="controlsStyle.grid">
          <label>
            <span>Sport type</span>
            <UIDropdown
              v-model="sportTypeStore.filter"
              :options="sportTypeStore.dropdownOptions"
              blankValue=""
              blankLabel="All sports"
            />
          </label>

          <label>
            <span>Distance</span>
            <UIRange v-model="activityStore.filterModel.distance" :step="1" :scale="0.001" />
          </label>

          <label>
            <span>Elevation</span>
            <UIRange v-model="activityStore.filterModel.elevation" :step="0.1" />
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
          <div :class="controlsStyle.buttons">
            <UIButtonGroup>
              <UIButton
                :disabled="filterState === 'initial'"
                :icon="filterState === 'canUndo' ? 'undo' : 'delete'"
                @click="revertFilter"
              >
                <UIMultiText
                  :texts="{ reset: 'Reset', undo: 'Undo' }"
                  :selected="filterState === 'canUndo' ? 'undo' : 'reset'"
                />
              </UIButton>
            </UIButtonGroup>
          </div>
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

  > span {
    white-space: nowrap;
  }
}
</style>
