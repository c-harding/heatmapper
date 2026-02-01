<script setup lang="ts">
import { type Gear } from '@strava-heatmapper/shared/interfaces';
import { bikeSportGroup, footSportGroup } from '@strava-heatmapper/shared/interfaces/SportType';
import { computed, ref } from 'vue';

import { useActivityStore } from '@/stores/ActivityStore';
import { useSportTypeStore } from '@/stores/SportTypeStore';
import {
  exactDeviceQuotes,
  type FilterModel,
  parseDeviceFilter,
  quotePairs,
  type RangeFilter,
} from '@/types/FilterModel';
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
import UITextField from '../ui/UITextField.vue';
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

const deviceOptionsWithSharedStrings = computed(() => {
  const prefixes = new Map<string, { name: string; occurrences: number; leaf: boolean }>();

  for (const device of activityStore.devices) {
    device.split(' ').forEach((_, index, array) => {
      const key = array.slice(0, index + 1).join(' ');
      let prefix = prefixes.get(key.toLowerCase());
      if (!prefix) {
        prefix = { name: key, occurrences: 0, leaf: false };
        prefixes.set(key.toLowerCase(), prefix);
      }
      prefix.occurrences += 1;
      prefix.leaf ||= index === array.length - 1;
    });
  }
  for (const prefix of prefixes.values()) {
    const ancestors = prefix.name
      .split(' ')
      .map((_, index, array) => array.slice(0, index).join(' '))
      .reverse();
    for (const ancestorName of ancestors) {
      const ancestor = prefixes.get(ancestorName.toLowerCase());
      if (ancestor && ancestor.occurrences <= prefix.occurrences) {
        prefixes.delete(ancestorName.toLowerCase());
      }
    }
  }
  return Array.from(prefixes.values(), (prefix) => prefix.name);
});

const deviceOptions = computed<string[]>(() => {
  const devices = activityStore.devices;
  const openQuote =
    !!activityStore.filterModel.device &&
    exactDeviceQuotes.includes(activityStore.filterModel.device[0] ?? '')
      ? activityStore.filterModel.device[0]
      : '';
  if (openQuote) {
    const closeQuote = quotePairs[openQuote] ?? openQuote;

    return Array.from(devices).map((device) => openQuote + device + closeQuote);
  } else {
    return deviceOptionsWithSharedStrings.value;
  }
});

const blankFilter = Object.freeze<FilterModel>({
  distance: undefined,
  elevation: undefined,
  sportType: undefined,
  starred: undefined,
  gear: undefined,
  isPrivate: undefined,
  isCommute: undefined,
  device: undefined,
});

function compareRanges(rangeA: RangeFilter | undefined, rangeB: RangeFilter | undefined) {
  return rangeA?.max === rangeB?.max && rangeA?.min === rangeB?.min;
}

function compareFilters(filterA: FilterModel, filterB: FilterModel) {
  return (
    (filterA.sportType ?? '') === (filterB.sportType ?? '') &&
    filterA.starred === filterB.starred &&
    compareRanges(filterA.distance, filterB.distance) &&
    compareRanges(filterA.elevation, filterB.elevation) &&
    (filterA.gear ?? '') === (filterB.gear ?? '') &&
    (filterA.isPrivate ?? null) === (filterB.isPrivate ?? null) &&
    (filterA.isCommute ?? null) === (filterB.isCommute ?? null) &&
    (filterA.device ?? '') === (filterB.device ?? '')
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
    activityStore.filterFields.has('isCommute') &&
      !activityStore.useRoutes &&
      activityStore.filterModel.isCommute !== undefined &&
      (activityStore.filterModel.isCommute ? 'only commutes' : 'excluding commutes'),
    activityStore.filterFields.has('isPrivate') &&
      activityStore.filterModel.isPrivate !== undefined &&
      (activityStore.filterModel.isPrivate ? 'only private' : 'only non-private'),
    activityStore.filterFields.has('device') &&
      activityStore.filterModel.device &&
      `only with device “${parseDeviceFilter(activityStore.filterModel.device).name}”`,
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

        <div
          v-if="activityStore.useRoutes && activityStore.filterFields.has('starred')"
          :class="[controlsStyle.label, $style.noPointer]"
        >
          <span>Starred</span>

          <SegmentedControl
            v-slot="{ option }"
            v-model="activityStore.filterModel.starred"
            :class="controlsStyle.segmentedControl"
            :deselectValue="[undefined]"
          >
            <SegmentedControlItem :option="option(false)" title="Only unstarred activities">
              <UIIcon icon="star_border" inline />
            </SegmentedControlItem>
            <SegmentedControlItem :option="option(true)" title="Only starred activities">
              <UIIcon icon="star" inline />
            </SegmentedControlItem>
          </SegmentedControl>
        </div>

        <label v-if="!activityStore.useRoutes && activityStore.filterFields.has('gear')">
          <span>Gear</span>
          <UIDropdown
            v-model="activityStore.filterModel.gear"
            :options="gearOptions"
            blankValue=""
            blankLabel="All gear"
          />
        </label>

        <label v-if="!activityStore.useRoutes && activityStore.filterFields.has('device')">
          <span>Device</span>
          <UITextField
            v-model.lazy="activityStore.filterModel.device"
            :pickList="deviceOptions"
            placeholder="All devices"
          />
        </label>

        <div
          v-if="activityStore.filterFields.has('isPrivate')"
          :class="[$style.noPointer, controlsStyle.label]"
        >
          <span>Visibility</span>
          <SegmentedControl
            v-slot="{ option }"
            v-model="activityStore.filterModel.isPrivate"
            :class="controlsStyle.segmentedControl"
            :deselectValue="[undefined]"
          >
            <SegmentedControlItem :option="option(false)" title="Only public activities">
              <UIIcon icon="lock_open" inline />
            </SegmentedControlItem>
            <SegmentedControlItem :option="option(true)" title="Only private activities">
              <UIIcon icon="lock" inline />
            </SegmentedControlItem>
          </SegmentedControl>
        </div>

        <div
          v-if="activityStore.filterFields.has('isCommute') && !activityStore.useRoutes"
          :class="[$style.noPointer, controlsStyle.label]"
        >
          <span>Commute</span>
          <SegmentedControl
            v-slot="{ option }"
            v-model="activityStore.filterModel.isCommute"
            :class="controlsStyle.segmentedControl"
            :deselectValue="[undefined]"
          >
            <SegmentedControlItem :option="option(true)" title="Only commutes">
              <UIIcon icon="work" inline />
            </SegmentedControlItem>
            <SegmentedControlItem :option="option(false)" title="Exclude commutes">
              <UIIcon icon="work_off" inline />
            </SegmentedControlItem>
          </SegmentedControl>
        </div>

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
