import { computed, ref, watch } from 'vue';

import config from '@/utils/config';

import { type DropdownChoice } from './components/map/PickerControl.vue';

export enum MapStyle {
  STANDARD = 'STANDARD',
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  OUTDOOR = 'OUTDOOR',
  STRAVA = 'STRAVA',
  HYBRID = 'HYBRID',
  SATELLITE = 'SATELLITE',
}

const mapboxStyleUrls: Record<MapStyle, string> = {
  [MapStyle.STANDARD]: 'mapbox://styles/mapbox/standard',
  [MapStyle.LIGHT]: 'mapbox://styles/mapbox/light-v11',
  [MapStyle.DARK]: 'mapbox://styles/mapbox/dark-v11',
  [MapStyle.OUTDOOR]: 'mapbox://styles/mapbox/outdoors-v12',
  [MapStyle.STRAVA]: 'mapbox://styles/charding/ckbfof39h4b2t1ildduhwlm15',
  [MapStyle.HYBRID]: 'mapbox://styles/mapbox/satellite-streets-v11',
  [MapStyle.SATELLITE]: 'mapbox://styles/mapbox/satellite-v9',
};

type MapStyleSelection = MapStyle | 'light-dark';

const STYLE_NAME_KEY = 'mapbox-style-name';

const mapStyleChoices: readonly DropdownChoice<MapStyleSelection>[] = [
  { value: MapStyle.STRAVA, label: 'Original style' },
  { value: MapStyle.STANDARD, label: 'Standard style' },
  { value: MapStyle.LIGHT, label: 'Light style' },
  { value: MapStyle.DARK, label: 'Dark style' },
  { value: 'light-dark', label: 'System (light/dark)' },
  { value: MapStyle.OUTDOOR, label: 'Outdoor style' },
  { value: MapStyle.HYBRID, label: 'Hybrid' },
  { value: MapStyle.SATELLITE, label: 'Satellite' },
];

function validateMapChoice(choice: string): choice is MapStyleSelection {
  return choice in MapStyle || choice === 'light-dark';
}

/**
 * Create a ref for storing the map style, persisted in localStorage
 *
 * @returns a ref to the map style
 */
export function useMapStyle() {
  const initialStyleName = localStorage.getItem(STYLE_NAME_KEY) || config.MAPBOX_STYLE;
  const initialStyle: MapStyleSelection = validateMapChoice(initialStyleName)
    ? initialStyleName
    : 'light-dark';
  const mapChoice = ref(initialStyle);

  const systemDarkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const systemDarkMode = ref(systemDarkModeQuery.matches);
  systemDarkModeQuery.addEventListener('change', () => {
    systemDarkMode.value = systemDarkModeQuery.matches;
  });

  const mapStyle = computed<MapStyle>(() => {
    if (!validateMapChoice(mapChoice.value) || mapChoice.value === 'light-dark') {
      return systemDarkMode.value ? MapStyle.DARK : MapStyle.LIGHT;
    } else {
      return mapChoice.value;
    }
  });

  const mapStyleUrl = computed(() => mapboxStyleUrls[mapStyle.value]);

  watch(mapChoice, (newChoice) => {
    localStorage.setItem(STYLE_NAME_KEY, newChoice);
  });

  return { mapChoice, mapStyle, mapStyleUrl, mapStyleChoices };
}
