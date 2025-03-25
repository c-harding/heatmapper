import { routeTypeMap, sportGroups, sportTypes } from '@strava-heatmapper/shared/interfaces';
import { computed, ref } from 'vue';

import { type DropdownOption } from '@/components/ui/UIDropdown.vue';

import { doesSportTypeMatch, useActivityService } from './useActivityService';

export default function useSportsTypes() {
  const { availableSports, filterModel, useRoutes } = useActivityService();

  const requestedMoreSportTypes = ref(false);

  const sports = computed(() => {
    const allSportsReponse = { sportTypes, sportGroups, showMoreButton: false };

    if (requestedMoreSportTypes.value || !availableSports.value) {
      return allSportsReponse;
    }

    const availableSportsResponse = { showMoreButton: true, ...availableSports.value };

    if (!filterModel.sportType) {
      return availableSportsResponse;
    }

    const foundInAvailableSports =
      filterModel.sportType in availableSports.value.sportGroups ||
      filterModel.sportType in availableSports.value.sportTypes;

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

  const sportsFilter = computed({
    get: () => filterModel.sportType,
    set(value: string | undefined) {
      if (value === showMoreButton.value) {
        requestedMoreSportTypes.value = true;
      } else {
        filterModel.sportType = value;
      }
    },
  });

  const sportsDropdownOptions = computed<DropdownOption[][]>(() => [
    mapSportTypes(sports.value.sportGroups, useRoutes.value),
    mapSportTypes(sports.value.sportTypes, useRoutes.value),
    sports.value.showMoreButton ? [showMoreButton] : [],
  ]);

  return { sportsFilter, sportsDropdownOptions };
}

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
