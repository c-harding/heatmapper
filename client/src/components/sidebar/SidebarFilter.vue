<script setup lang="ts">
import { computed, ref } from 'vue';

import { useActivityService } from '@/services/useActivityService';
import useSportsTypes from '@/services/useSportsTypes';
import { type FilterModel, type RangeFilter } from '@/types/FilterModel';
import { formatKilometers, formatMeters } from '@/utils/numberFormat';
import { loadFilterModel, saveFilterModel } from '@/utils/storage';

import UIVerticalTab from '../ui/tabs/UIVerticalTab.vue';
import UIVerticalTabContainer from '../ui/tabs/UIVerticalTabContainer.vue';
import UIButton from '../ui/UIButton.vue';
import UIButtonGroup from '../ui/UIButtonGroup.vue';
import UIDropdown from '../ui/UIDropdown.vue';
import UIMultiText from '../ui/UIMultiText.vue';
import UIRange from '../ui/UIRange.vue';
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
const savedFilter = ref<FilterModel>(loadFilterModel() ?? blankFilter);

const isSaved = computed(() => compareFilters(filterModel, savedFilter.value));

const hideResetToSaved = computed(() => compareFilters(blankFilter, savedFilter.value));
const canResetToSaved = computed(() => compareFilters(filterModel, savedFilter.value));

const filterState = computed<'changed' | 'canUndo' | 'initial'>(() => {
  if (!compareFilters(filterModel, blankFilter)) return 'changed';
  else if (previousFilters.value) return 'canUndo';
  else return 'initial';
});

function revertFilter() {
  if (!compareFilters(filterModel, blankFilter)) {
    previousFilters.value = { ...filterModel };
    Object.assign(filterModel, blankFilter);
  } else {
    Object.assign(filterModel, previousFilters.value);
  }
}

function saveFilter() {
  saveFilterModel(filterModel);
  savedFilter.value = { ...filterModel };
}
function resetToSaved() {
  previousFilters.value = { ...filterModel };
  Object.assign(filterModel, savedFilter.value);
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
    formatRange(filterModel.distance, 'distance', formatKilometers),
    formatRange(filterModel.elevation, 'elevation', formatMeters),
    useRoutes &&
      filterModel.starred !== undefined &&
      (filterModel.starred ? 'only starred' : 'only unstarred'),
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
              v-model="sportsFilter"
              :options="sportsDropdownOptions"
              blankValue=""
              blankLabel="All sports"
            />
          </label>

          <label>
            <span>Distance</span>
            <UIRange v-model="filterModel.distance" :step="1" :scale="0.001" />
          </label>

          <label>
            <span>Elevation</span>
            <UIRange v-model="filterModel.elevation" :step="0.1" />
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
          <div :class="controlsStyle.buttons">
            <UIButtonGroup>
              <UIButton icon="save" :disabled="isSaved" @click="saveFilter"> Save </UIButton>
              <UIButton
                :disabled="filterState === 'initial'"
                :icon="filterState === 'canUndo' ? 'undo' : 'delete'"
                @click="revertFilter"
              >
                <UIMultiText
                  :texts="{ clear: 'Clear', undo: 'Undo' }"
                  :selected="filterState === 'canUndo' ? 'undo' : 'clear'"
                />
              </UIButton>
              <UIButton
                v-if="!hideResetToSaved"
                :disabled="canResetToSaved"
                icon="settings_backup_restore"
                @click="resetToSaved"
              >
                Reset
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
