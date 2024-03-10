import { ref, watch } from 'vue';

import { MapStyle } from '@/MapStyle';

// Set in vite.config.js
declare const MAPBOX_STYLE: keyof typeof MapStyle;

const styleNameKey = 'mapbox-style-name';

/**
 * Create a ref for storing the map style, persisted in localStorage
 *
 * @returns a ref to the map style
 */
export function useMapStyle() {
  const initialStyleName = localStorage[styleNameKey] || MAPBOX_STYLE;
  const initialStyle = MapStyle[initialStyleName as keyof typeof MapStyle] ?? MapStyle.LIGHT;
  const mapStyle = ref(initialStyle);

  watch(mapStyle, (newStyle) => {
    const styleName = Object.entries(MapStyle).find(([_name, style]) => style === newStyle)?.[0];
    if (styleName) {
      localStorage.setItem(styleNameKey, styleName);
    }
  });

  return mapStyle;
}
