import { routeTypeMap, sportGroups, sportTypes } from '@strava-heatmapper/shared/interfaces';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { type DropdownOption } from '@/components/ui/UIDropdown.vue';
import { doesSportTypeMatch, useActivityStore } from '@/stores/ActivityStore';

export const useSportTypeStore = defineStore('sportType', () => {
  const activityStore = useActivityStore();

  const requestedMore = ref(false);

  const sports = computed(() => {
    const allSportsReponse = { sportTypes, sportGroups, showMoreButton: false };

    if (requestedMore.value || !activityStore.availableSports) {
      return allSportsReponse;
    }

    const availableSportsResponse = { showMoreButton: true, ...activityStore.availableSports };

    if (!activityStore.filterModel.sportType) {
      return availableSportsResponse;
    }

    const foundInAvailableSports =
      activityStore.filterModel.sportType in activityStore.availableSports.sportGroups ||
      activityStore.filterModel.sportType in activityStore.availableSports.sportTypes;

    if (foundInAvailableSports) {
      return availableSportsResponse;
    } else {
      return allSportsReponse;
    }
  });

  const showMoreButton = {
    label: 'Show more…',
    value: 'SHOW_MORE',
  } as const satisfies DropdownOption;

  const filter = computed({
    get: () => activityStore.filterModel.sportType,
    set(value: string | undefined) {
      if (value === showMoreButton.value) {
        requestedMore.value = true;
      } else {
        activityStore.filterModel.sportType = value;
      }
    },
  });

  const dropdownOptions = computed<DropdownOption[][]>(() => [
    mapSportTypes(sports.value.sportGroups, activityStore.useRoutes),
    mapSportTypes(sports.value.sportTypes, activityStore.useRoutes),
    sports.value.showMoreButton ? [showMoreButton] : [],
  ]);

  return { filter, dropdownOptions, requestedMore };
});

function mapSportTypes(sportTypes: Record<string, string>, useRoutes: boolean): DropdownOption[] {
  return Object.entries(sportTypes)
    .map(([value, label]) => ({
      value,
      label,
      disabled:
        useRoutes &&
        !Object.values(routeTypeMap).some((sportType) => doesSportTypeMatch(value, sportType)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
