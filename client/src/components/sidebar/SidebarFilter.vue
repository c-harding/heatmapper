<script setup lang="ts">
import { type Gear } from '@strava-heatmapper/shared/interfaces';
import { bikeSportGroup, footSportGroup } from '@strava-heatmapper/shared/interfaces/SportType';
import { computed, ref } from 'vue';

import { useActivityStore } from '@/stores/ActivityStore';
import { useSportTypeStore } from '@/stores/SportTypeStore';
import {
  exactDeviceQuotes,
  type FilterModel,
  liveRange,
  parseDeviceFilter,
  quotePairs,
  type RangeFilter,
} from '@/types/FilterModel';
import { formatKilometers, formatMeters } from '@/utils/numberFormat';
import { loadFilterModel, saveFilterModel } from '@/utils/storage';
import { useUndoable } from '@/utils/useUndoable';

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

const items = computed(() => (activityStore.useRoutes ? 'routes' : 'activities'));

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
  const a = liveRange(rangeA);
  const b = liveRange(rangeB);
  return a?.max === b?.max && a?.min === b?.min;
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

const isActive = computed(() => !compareFilters(activityStore.liveFilterModel, blankFilter));

const savedFilter = ref<FilterModel>(loadFilterModel() ?? blankFilter);

const isSaved = computed(() => compareFilters(activityStore.filterModel, savedFilter.value));

const hideResetToSaved = computed(() => compareFilters(blankFilter, savedFilter.value));

const filtersChanged = computed(() => !compareFilters(activityStore.filterModel, blankFilter));

const { state: filterState, clearOrRestore: revertFilter } = useUndoable({
  active: () => filtersChanged.value,
  take: () => ({ ...activityStore.filterModel }),
  clear: () => Object.assign(activityStore.filterModel, blankFilter),
  restore: (filters) => Object.assign(activityStore.filterModel, blankFilter, filters),
  // Only once there is a filter again, as an edit that leaves them blank keeps the Undo
  changes: [filtersChanged],
});

function saveFilter() {
  saveFilterModel(activityStore.filterModel);
  savedFilter.value = { ...activityStore.filterModel };
}

const { state: restoreState, clearOrRestore: restoreOrUndo } = useUndoable({
  // Here what is cleared away is any difference from the default
  active: () => !isSaved.value,
  take: () => ({ ...activityStore.filterModel }),
  clear: () => Object.assign(activityStore.filterModel, blankFilter, savedFilter.value),
  restore: (filters) => Object.assign(activityStore.filterModel, blankFilter, filters),
  changes: [isSaved],
});

function formatRange(
  range: RangeFilter | undefined,
  label: string,
  format: (value: number) => string,
): string | undefined {
  const { min, max } = range ?? {};
  if (min !== undefined && max !== undefined) return `${format(min)} ≤ ${label} ≤ ${format(max)}`;
  if (min !== undefined) return `${label} ≥ ${format(min)}`;
  if (max !== undefined) return `${label} ≤ ${format(max)}`;
  return undefined;
}

function formatGear(id: string | undefined) {
  if (!id) return undefined;
  const chosenGear = activityStore.gear.get(id);
  if (!chosenGear) return undefined;
  return `using ${chosenGear.name}`;
}

const filterSummary = computed(() => {
  const live = activityStore.liveFilterModel;
  return [
    live.sportType && chosenSportLabel.value,
    formatRange(live.distance, 'distance', formatKilometers),
    formatRange(live.elevation, 'elevation', formatMeters),
    live.starred !== undefined && (live.starred ? 'only starred' : 'only unstarred'),
    formatGear(live.gear),
    live.isCommute !== undefined && (live.isCommute ? 'only commutes' : 'excluding commutes'),
    live.isPrivate !== undefined && (live.isPrivate ? 'only private' : 'only non-private'),
    live.device && `only with device “${parseDeviceFilter(live.device).name}”`,
  ].filter((string): string is string => !!string);
});

const showHelp = ref(false);

function openHelp() {
  showHelp.value = true;
}
</script>

<template>
  <UIVerticalTab
    :tab
    icon="filter_alt"
    :expandedContentClass="$style.content"
    heading="Filter"
    :summary="filterSummary"
    summaryEmpty="none set"
    :isActive
  >
    <template #meta>
      <UIButton ghost icon="help" @click="openHelp">Fields</UIButton>
      <UIButton
        ghost
        :disabled="filterState === 'initial'"
        :icon="filterState === 'undo' ? 'undo' : 'delete'"
        @click="revertFilter"
      >
        <UIMultiText
          :texts="{ clear: 'Clear', undo: 'Undo' }"
          :selected="filterState === 'undo' ? 'undo' : 'clear'"
        />
      </UIButton>
    </template>
    <template #expanded>
      <div :class="controlsStyle.grid">
        <label v-if="activityStore.liveFields.has('sportType')">
          <span>Sport type</span>
          <UIDropdown
            v-model="sportTypeStore.filter"
            :options="sportTypeStore.dropdownOptions"
            blankValue=""
            blankLabel="All sports"
          />
        </label>

        <div v-if="activityStore.liveFields.has('distance')" :class="controlsStyle.label">
          <span>Distance</span>
          <UIRange
            v-model="activityStore.filterModel.distance"
            :step="1"
            :scale="0.001"
            suffix="km"
          />
        </div>

        <div v-if="activityStore.liveFields.has('elevation')" :class="controlsStyle.label">
          <span>Elevation</span>
          <UIRange v-model="activityStore.filterModel.elevation" :step="0.1" suffix="m" />
        </div>

        <div
          v-if="activityStore.liveFields.has('starred')"
          :class="[controlsStyle.label, $style.noPointer]"
        >
          <span>Starred</span>

          <SegmentedControl
            v-slot="{ option }"
            v-model="activityStore.filterModel.starred"
            :class="controlsStyle.segmentedControl"
            :deselectValue="[undefined]"
          >
            <SegmentedControlItem :option="option(false)" title="Only unstarred routes">
              <UIIcon icon="star_border" inline />
            </SegmentedControlItem>
            <SegmentedControlItem :option="option(true)" title="Only starred routes">
              <UIIcon icon="star" inline />
            </SegmentedControlItem>
          </SegmentedControl>
        </div>

        <label v-if="activityStore.liveFields.has('gear')">
          <span>Gear</span>
          <UIDropdown
            v-model="activityStore.filterModel.gear"
            :options="gearOptions"
            blankValue=""
            blankLabel="All gear"
          />
        </label>

        <label v-if="activityStore.liveFields.has('device')">
          <span>Device</span>
          <UITextField
            v-model.lazy="activityStore.filterModel.device"
            :pickList="deviceOptions"
            placeholder="All devices"
          />
        </label>

        <div
          v-if="activityStore.liveFields.has('isPrivate')"
          :class="[$style.noPointer, controlsStyle.label]"
        >
          <span>Visibility</span>
          <SegmentedControl
            v-slot="{ option }"
            v-model="activityStore.filterModel.isPrivate"
            :class="controlsStyle.segmentedControl"
            :deselectValue="[undefined]"
          >
            <SegmentedControlItem :option="option(false)" :title="`Only public ${items}`">
              <UIIcon icon="lock_open" inline />
            </SegmentedControlItem>
            <SegmentedControlItem :option="option(true)" :title="`Only private ${items}`">
              <UIIcon icon="lock" inline />
            </SegmentedControlItem>
          </SegmentedControl>
        </div>

        <div
          v-if="activityStore.liveFields.has('isCommute')"
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

        <div v-if="activityStore.filterFields.size === 0" :class="controlsStyle.buttons">
          <em>All filters are hidden</em>
        </div>
        <div v-else :class="controlsStyle.label">
          <span>Default filter</span>
          <UIButtonGroup>
            <UIButton icon="save" :disabled="isSaved" @click="saveFilter"> Save </UIButton>
            <UIButton
              v-if="!hideResetToSaved"
              :disabled="restoreState === 'initial'"
              :icon="restoreState === 'undo' ? 'undo' : 'settings_backup_restore'"
              @click="restoreOrUndo"
            >
              <UIMultiText
                :texts="{ restore: 'Restore', undo: 'Undo' }"
                :selected="restoreState === 'undo' ? 'undo' : 'restore'"
              />
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
    margin-inline-end: auto;
  }
}
</style>
