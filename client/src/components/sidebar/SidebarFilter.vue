<script setup lang="ts">
import { type Gear } from '@strava-heatmapper/shared/interfaces';
import { bikeSportGroup, footSportGroup } from '@strava-heatmapper/shared/interfaces/SportType';
import { computed, ref } from 'vue';

import { useActivityStore } from '@/stores/ActivityStore';
import { useSportTypeStore } from '@/stores/SportTypeStore';
import { type FilterModel, type RangeFilter } from '@/types/FilterModel';
import { formatKilometers, formatMeters } from '@/utils/numberFormat';
import { loadFilterModel, saveFilterModel } from '@/utils/storage';

import SegmentedControl from '../segmented-control/SegmentedControl.vue';
import SegmentedControlItem from '../segmented-control/SegmentedControlItem.vue';
import UIVerticalTab from '../ui/tabs/UIVerticalTab.vue';
import { type Tab } from '../ui/tabs/UIVerticalTabContainer.vue';
import UIButton from '../ui/UIButton.vue';
import UIButtonGroup from '../ui/UIButtonGroup.vue';
import UIDropdown, { type DropdownOption } from '../ui/UIDropdown.vue';
import UIIcon from '../ui/UIIcon.vue';
import UIMultiText from '../ui/UIMultiText.vue';
import UIRange from '../ui/UIRange.vue';
import controlsStyle from './controls.module.scss';
import FilterHelp from './FilterHelp.vue';

defineProps<{ tab: Tab<string> }>();

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

const offerGearByIsBike = computed(() => {
  const offers = new Set<boolean>([true, false]);

  const filterModel = activityStore.filterModel.sportType;
  if (!filterModel) return offers;
  const chosenFilters = filterModel.split(',');
  if (bikeSportGroup.split(',').every((sport) => !chosenFilters.includes(sport))) {
    offers.delete(true);
  }
  if (footSportGroup.split(',').every((sport) => !chosenFilters.includes(sport))) {
    offers.delete(false);
  }
  return offers;
});

const gearOptions = computed<DropdownOption[][]>(() => {
  const pairs = Array.from(activityStore.gear.entries()).filter(
    (entry): entry is [string, Gear] => !!entry[1],
  );
  const partitions = [
    offerGearByIsBike.value.has(false) && pairs.filter(([, piece]) => !piece.isBike),
    offerGearByIsBike.value.has(true) && pairs.filter(([, piece]) => piece.isBike),
  ].filter((partition) => !!partition);
  return partitions.map((partition) =>
    partition.map(([id, piece]): DropdownOption => ({ label: piece.name, value: id })),
  );
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

const isSaved = computed(() => compareFilters(activityStore.filterModel, savedFilter.value));

const hideResetToSaved = computed(() => compareFilters(blankFilter, savedFilter.value));
const canResetToSaved = computed(() =>
  compareFilters(activityStore.filterModel, savedFilter.value),
);

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

function saveFilter() {
  saveFilterModel(activityStore.filterModel);
  savedFilter.value = { ...activityStore.filterModel };
}
function resetToSaved() {
  previousFilters.value = { ...activityStore.filterModel };
  Object.assign(activityStore.filterModel, savedFilter.value);
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

function formatGear(id: string | undefined) {
  if (!id) return undefined;
  const chosenGear = activityStore.gear.get(id);
  if (!chosenGear) return undefined;
  return `using ${chosenGear.name}`;
}

const filterSummary = computed(() =>
  [
    activityStore.filterFields.has('sportType') && chosenSportLabel.value,
    activityStore.filterFields.has('distance') &&
      formatRange(activityStore.filterModel.distance, 'distance', formatKilometers),
    activityStore.filterFields.has('elevation') &&
      formatRange(activityStore.filterModel.elevation, 'elevation', formatMeters),
    activityStore.filterFields.has('starred') &&
      activityStore.useRoutes &&
      activityStore.filterModel.starred !== undefined &&
      (activityStore.filterModel.starred ? 'only starred' : 'only unstarred'),
    activityStore.filterFields.has('gear') && formatGear(activityStore.filterModel.gear),
    activityStore.filterFields.has('isPrivate') &&
      activityStore.filterModel.isPrivate !== undefined &&
      (activityStore.filterModel.isPrivate ? 'only private' : 'only non-private'),
  ].filter((string): string is string => !!string),
);

const showHelp = ref(false);
</script>

<template>
  <UIVerticalTab
    :tab
    icon="filter_alt"
    :expandedContentClass="$style.content"
    heading="Filter"
    :summaryItems="filterSummary"
    summaryEmpty="none set"
    @help="showHelp = true"
  >
    <template #expanded>
      <div :class="controlsStyle.grid">
        <label v-if="activityStore.filterFields.has('sportType')">
          <span>Sport type</span>
          <UIDropdown
            v-model="sportTypeStore.filter"
            :options="sportTypeStore.dropdownOptions"
            blankValue=""
            blankLabel="All sports"
          />
        </label>

        <label v-if="activityStore.filterFields.has('distance')">
          <span>Distance</span>
          <UIRange
            v-model="activityStore.filterModel.distance"
            :step="1"
            :scale="0.001"
            suffix="km"
          />
        </label>

        <label v-if="activityStore.filterFields.has('elevation')">
          <span>Elevation</span>
          <UIRange v-model="activityStore.filterModel.elevation" :step="0.1" suffix="m" />
        </label>

        <label
          v-if="activityStore.useRoutes && activityStore.filterFields.has('starred')"
          title="Only show starred routes (double-click for unstarred routes)"
          :class="$style.noPointer"
        >
          <span>Starred</span>
          <UIButton
            light
            :invertColor="activityStore.filterModel.starred === false"
            :icon="activityStore.filterModel.starred === undefined ? 'star_border' : 'star'"
            @click="
              activityStore.filterModel.starred =
                activityStore.filterModel.starred !== undefined ? undefined : true
            "
            @dbl-click="activityStore.filterModel.starred = false"
          />
        </label>

        <label v-if="!activityStore.useRoutes && activityStore.filterFields.has('gear')">
          <span>Gear</span>
          <UIDropdown
            v-model="activityStore.filterModel.gear"
            :options="gearOptions"
            blankValue=""
            blankLabel="All gear"
          />
        </label>

        <label
          v-if="activityStore.filterFields.has('isPrivate')"
          :title="`Only show private ${activityStore.useRoutes ? 'routes' : 'activities'} (double-click for non-private ${activityStore.useRoutes ? 'routes' : 'activities'})`"
          :class="$style.noPointer"
        >
          <span>Visibility</span>
          <SegmentedControl
            v-slot="{ option }"
            v-model="activityStore.filterModel.isPrivate"
            :class="controlsStyle.segmentedControl"
            :deselectValue="[undefined]"
          >
            <SegmentedControlItem :option="option(false)">
              <UIIcon icon="lock_open" inline />
            </SegmentedControlItem>
            <SegmentedControlItem :option="option(true)">
              <UIIcon icon="lock" inline />
            </SegmentedControlItem>
          </SegmentedControl>
        </label>

        <div :class="controlsStyle.buttons">
          <em v-if="activityStore.filterFields.size === 0">All filters are hidden</em>
          <UIButtonGroup v-else>
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
      <FilterHelp v-model="showHelp" />
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
