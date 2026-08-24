import { type StyleSpecification } from 'mapbox-gl';
import { computed, ref, watch } from 'vue';

import config from '@/utils/config';

import { type DropdownChoice } from './components/map/PickerControl.vue';

export enum MapStyle {
  STANDARD = 'STANDARD',
  MINIMAL_LIGHT = 'MINIMAL_LIGHT',
  MINIMAL_DARK = 'MINIMAL_DARK',
  OUTDOOR = 'OUTDOOR',
  ORIGINAL = 'ORIGINAL',
  NATURAL_LIGHT = 'NATURAL_LIGHT',
  NATURAL_DARK = 'NATURAL_DARK',
  HYBRID = 'HYBRID',
  SATELLITE = 'SATELLITE',
}

/**
 * Resolve a style URL into something mapbox-gl will take.
 *
 * The styles we serve ourselves cannot know which origin they will be served from, so they name
 * their sprite by path. mapbox-gl parses that field before it works out whether the URL is one of
 * its own, and its parser rejects anything without a scheme, so fetch the style here and fill the
 * origin in. Styles Mapbox host stay the URL they are, for mapbox-gl to fetch for itself.
 *
 * @param url the style to load, either a mapbox: URL or a path we serve
 * @returns the URL to hand to mapbox-gl, or the style itself once we have made it loadable
 */
export async function resolveStyle(url: string): Promise<string | StyleSpecification> {
  // Ask the Mapbox Styles API to optimize the styles it hosts, so that their tiles arrive
  // trimmed to what the style actually draws.
  if (url.startsWith('mapbox://')) return `${url}?optimize=true`;
  if (!url.startsWith('/')) return url;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);

  const style = (await response.json()) as StyleSpecification;
  if (typeof style.sprite === 'string') {
    style.sprite = new URL(style.sprite, location.href).toString();
  }
  return style;
}

const mapboxStyleUrls: Record<MapStyle, string> = {
  [MapStyle.STANDARD]: 'mapbox://styles/mapbox/standard',
  [MapStyle.MINIMAL_LIGHT]: 'mapbox://styles/mapbox/light-v11',
  [MapStyle.MINIMAL_DARK]: 'mapbox://styles/mapbox/dark-v11',
  [MapStyle.OUTDOOR]: 'mapbox://styles/mapbox/outdoors-v12',
  [MapStyle.ORIGINAL]: '/styles/original.json',
  [MapStyle.NATURAL_LIGHT]: '/styles/generated/natural-light.json',
  [MapStyle.NATURAL_DARK]: '/styles/generated/natural-dark.json',
  [MapStyle.HYBRID]: 'mapbox://styles/mapbox/satellite-streets-v11',
  [MapStyle.SATELLITE]: 'mapbox://styles/mapbox/satellite-v9',
};

interface SystemStylePair {
  light: MapStyle;
  dark: MapStyle;
}

// Choices that name a light and a dark style to pick between, rather than a style of their own.
const systemStyles = {
  minimal: { light: MapStyle.MINIMAL_LIGHT, dark: MapStyle.MINIMAL_DARK },
  natural: { light: MapStyle.NATURAL_LIGHT, dark: MapStyle.NATURAL_DARK },
} as const satisfies Record<string, SystemStylePair>;

type SystemStyle = keyof typeof systemStyles;

type MapStyleSelection = MapStyle | SystemStyle;

const STYLE_NAME_KEY = 'mapbox-style-name';

// Where MAPBOX_STYLE, or a stored choice, names a style that is not one of ours.
const FALLBACK_STYLE: MapStyleSelection = 'minimal';

// A migration table to cover the renamed styles (2026-08).
const renamedStyles: Partial<Record<string, MapStyleSelection>> = {
  LIGHT: MapStyle.MINIMAL_LIGHT,
  DARK: MapStyle.MINIMAL_DARK,
  'light-dark': 'minimal',
  STRAVA: MapStyle.ORIGINAL,
};

const mapStyleChoices: readonly DropdownChoice<MapStyleSelection>[] = [
  { value: 'natural', label: 'Natural' },
  { value: MapStyle.NATURAL_LIGHT, label: 'Natural Light' },
  { value: MapStyle.NATURAL_DARK, label: 'Natural Dark' },
  { value: MapStyle.ORIGINAL, label: 'Original' },
  { value: 'minimal', label: 'Minimal' },
  { value: MapStyle.MINIMAL_LIGHT, label: 'Minimal Light' },
  { value: MapStyle.MINIMAL_DARK, label: 'Minimal Dark' },
  { value: MapStyle.STANDARD, label: 'Standard' },
  { value: MapStyle.OUTDOOR, label: 'Outdoor' },
  { value: MapStyle.SATELLITE, label: 'Satellite' },
  { value: MapStyle.HYBRID, label: 'Hybrid' },
];

function validateMapChoice(choice: string): choice is MapStyleSelection {
  return choice in MapStyle || choice in systemStyles;
}

function followsSystem(choice: MapStyleSelection): choice is SystemStyle {
  return choice in systemStyles;
}

/**
 * Create a ref for storing the map style, persisted in localStorage
 *
 * @returns a ref to the map style
 */
export function useMapStyle() {
  const storedName = localStorage.getItem(STYLE_NAME_KEY);
  const chosenName = storedName || config.MAPBOX_STYLE;
  const styleName = renamedStyles[chosenName] ?? chosenName;
  if (storedName && styleName !== storedName) localStorage.setItem(STYLE_NAME_KEY, styleName);

  const initialStyle: MapStyleSelection = validateMapChoice(styleName)
    ? styleName
    : FALLBACK_STYLE;
  const mapChoice = ref(initialStyle);

  const systemDarkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const systemDarkMode = ref(systemDarkModeQuery.matches);
  systemDarkModeQuery.addEventListener('change', () => {
    systemDarkMode.value = systemDarkModeQuery.matches;
  });

  const mapStyle = computed<MapStyle>(() => {
    const choice = mapChoice.value;
    if (followsSystem(choice)) {
      const { light, dark } = systemStyles[choice];
      return systemDarkMode.value ? dark : light;
    } else {
      return choice;
    }
  });

  const mapStyleUrl = computed(() => mapboxStyleUrls[mapStyle.value]);

  watch(mapChoice, (newChoice) => {
    localStorage.setItem(STYLE_NAME_KEY, newChoice);
  });

  return { mapChoice, mapStyle, mapStyleUrl, mapStyleChoices };
}
