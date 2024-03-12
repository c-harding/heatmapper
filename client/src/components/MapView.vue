<script lang="tsx">
import type { Map as MapboxMap } from 'mapbox-gl';

import PickerControl from './PickerControl.vue';

declare global {
  interface Window {
    cachedMapElement?: MapboxMap;
  }
}

// Set in vite.config.js
declare const MAPBOX_TOKEN: string;
declare const MAPBOX_STYLE: keyof typeof MapStyle;
</script>

<script setup lang="tsx">
import polyline from '@mapbox/polyline';
import type { MapItem } from '@strava-heatmapper/shared/interfaces';
import type { LngLatBounds, LngLatLike, MapMouseEvent } from 'mapbox-gl';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { type MapStyle, useMapStyle } from '@/MapStyle';
import { addLayersToMap, applyMapItems, MapSourceLayer, useMapSelection } from '@/utils/map';

import Viewport from '../Viewport';

const props = withDefaults(
  defineProps<{
    center: LngLatLike;
    zoom: number;
    selected?: string[];
    mapItems: readonly MapItem[];
  }>(),
  {
    selected: () => [],
  },
);

defineExpose({ zoomToSelection });

const mapboxgl = await import('mapbox-gl');

const container = ref<HTMLElement>();

const token = MAPBOX_TOKEN;

const emit = defineEmits<{
  (e: 'update:center', value: LngLatLike): void;
  (e: 'update:zoom', value: number): void;
  (e: 'update:selected', value: string[]): void;
}>();

const { mapStyleUrl, mapChoice, mapStyle, mapStyleChoices } = useMapStyle();

const terrain = ref(false);

const topCorner = document.dir === 'rtl' ? 'top-left' : 'top-right';

if (!window.cachedMapElement) {
  const newMap = new mapboxgl.Map({
    accessToken: token,
    container: document.createElement('div'),
    style: mapStyleUrl.value,
    center: props.center,
    zoom: props.zoom,
  });

  newMap.addControl(new mapboxgl.FullscreenControl(), topCorner);
  newMap.addControl(
    new mapboxgl.NavigationControl({ showZoom: false, visualizePitch: true }),
    topCorner,
  );

  newMap.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

  window.cachedMapElement = newMap;
}

const map = window.cachedMapElement;

onMounted(() => {
  container.value?.appendChild(map.getContainer());
  map.resize();
});

const selectedMapItems = computed<readonly MapItem[]>(() =>
  props.mapItems.filter((item) => props.selected.includes(item.id)),
);

watch(
  () => props.mapItems,
  (mapItems) => {
    applyMapItems(map, mapItems, MapSourceLayer.LINES);
  },
);

watch(selectedMapItems, (selectedMapItems) => {
  applyMapItems(map, selectedMapItems, MapSourceLayer.SELECTED);
});

watch(mapStyleUrl, (style) => {
  map.setStyle(style);
  map.once('styledata', () => {
    mapLoaded(map);
    return onTerrain();
  });
});

const onTerrain = () => {
  if (terrain.value) {
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      });
    }
    map.setTerrain({ source: 'mapbox-dem' });
    map.setProjection('globe');
  } else {
    map.setTerrain(null);
    map.setProjection('mercator');
  }
};

watch(terrain, onTerrain);

/**
 * Calculate best way of zooming to fit the activity while avoiding the controls in the corners.
 *
 * This works by considering the visual aspect ratio of the route, and for each corner control,
 * considering either placing the route strictly horizontally offset from the control or strictly
 * vertically offset from the control.
 *
 * It compares the area of the bounding box of the activity in each case.
 */
function optimiseViewport(map: MapboxMap, bounds: LngLatBounds) {
  const padding = 10;

  const { width, height } = map.getCanvas().getBoundingClientRect();

  const northWest = mapboxgl.MercatorCoordinate.fromLngLat(bounds.getNorthWest());
  const southEast = mapboxgl.MercatorCoordinate.fromLngLat(bounds.getSouthEast());

  const aspectRatio = (northWest.y - southEast.y) / (northWest.x - southEast.x);

  const topLeft = container.value?.querySelector('.mapboxgl-ctrl-top-left');
  const topRight = container.value?.querySelector('.mapboxgl-ctrl-top-right');
  const bottomLeft = container.value?.querySelector('.mapboxgl-ctrl-bottom-left');
  const bottomRight = container.value?.querySelector('.mapboxgl-ctrl-bottom-right');

  const viewports = [
    // Padding is given here as well as at the end so that 2 × padding is maintained from the edges,
    // and 1 × padding is maintained from the controls
    new Viewport(width, height, { left: padding, top: padding, bottom: padding, right: padding }),
  ]
    .flatMap((viewport) => [
      viewport.withOffset({ top: topLeft?.clientHeight }),
      viewport.withOffset({ left: topLeft?.clientWidth ?? 0 }),
    ])
    .flatMap((viewport) => [
      viewport.withOffset({ top: topLeft?.clientHeight }),
      viewport.withOffset({ left: topLeft?.clientWidth ?? 0 }),
    ])
    .flatMap((viewport) => [
      viewport.withOffset({ bottom: bottomLeft?.clientHeight }),
      viewport.withOffset({ left: bottomLeft?.clientWidth ?? 0 }),
    ])
    .flatMap((viewport) => [
      viewport.withOffset({ top: topRight?.clientHeight }),
      viewport.withOffset({ right: topRight?.clientWidth ?? 0 }),
    ])
    .flatMap((viewport) => [
      viewport.withOffset({ bottom: bottomRight?.clientHeight }),
      viewport.withOffset({ right: bottomRight?.clientWidth ?? 0 }),
    ])
    .map((viewport) => viewport.withPadding(padding));

  return viewports.reduce((best, current) =>
    best.screenArea(aspectRatio) > current.screenArea(aspectRatio) ? best : current,
  );
}

function flyTo(mapItems: readonly MapItem[], zoom = false): void {
  if (mapItems.length === 0) return;
  const coordinates = mapItems.flatMap(({ map: line }) =>
    polyline.decode(line).map<[number, number]>(([y, x]) => [x, y]),
  );
  const bounds = coordinates.reduce(
    (acc, coord) => acc.extend(coord),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
  );

  const viewport = optimiseViewport(map, bounds);

  const screenNorthEast = map.unproject([
    viewport.width - viewport.offsets.right,
    viewport.offsets.top,
  ]);
  const screenSouthWest = map.unproject([
    viewport.offsets.left,
    viewport.height - viewport.offsets.bottom,
  ]);
  const screenBounds = new mapboxgl.LngLatBounds(screenSouthWest, screenNorthEast);

  if (
    zoom ||
    !screenBounds.contains(bounds.getSouthWest()) ||
    !screenBounds.contains(bounds.getNorthEast())
  ) {
    const maxZoom = zoom ? 30 : map.getZoom();
    map.fitBounds(bounds, {
      padding: viewport.offsets,
      linear: true,
      maxZoom,
    });
  }
}

function zoomToSelection(): void {
  flyTo(selectedMapItems.value, true);
}

const resizeHandler = () => map.resize();

onMounted(() => {
  window.addEventListener('transitionend', resizeHandler, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('transitionend', resizeHandler);
});

async function mapLoaded(map: MapboxMap): Promise<void> {
  map.resize();

  addLayersToMap(map, mapStyle.value);
  onTerrain();

  applyMapItems(map, props.mapItems, MapSourceLayer.LINES);
  applyMapItems(map, selectedMapItems.value, MapSourceLayer.SELECTED);
}

function dblclick(e: MapMouseEvent) {
  if (selectedMapItems.value.length !== 0) {
    e.preventDefault();
    nextTick(() => zoomToSelection());
  }
}

function zoomend(map: MapboxMap): void {
  emit('update:zoom', map.getZoom());
}

function moveend(map: MapboxMap) {
  emit('update:center', map.getCenter());
}

const { click } = useMapSelection({
  getExternalSelection: () => props.selected,
  flyToSelection: () => flyTo(selectedMapItems.value, false),
  emitUpdate: (selected) => emit('update:selected', selected),
});

const buttonTarget = map.getContainer().querySelector(`.mapboxgl-ctrl-${topCorner}`);

map.on('zoomend', () => zoomend(map));
map.on('moveend', () => moveend(map));
map.on('click', (ev) => click(ev));
map.on('dblclick', (ev) => dblclick(ev));
map.once('idle', () => mapLoaded(map));
</script>

<template>
  <div ref="container" class="map-container" />
  <Teleport :to="buttonTarget">
    <div class="mapboxgl-ctrl mapboxgl-ctrl-group">
      <button @click="terrain = !terrain">{{ terrain ? '2D' : '3D' }}</button>
    </div>

    <div class="mapboxgl-ctrl mapboxgl-ctrl-group">
      <PickerControl v-model="mapChoice" :choices="mapStyleChoices" />
    </div>
  </Teleport>
</template>

<style>
@import 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css' layer(mapbox);

.map-container {
  display: contents;
}

.mapboxgl-map {
  flex: 1;
  z-index: 0;
}

.mapboxgl-canvas {
  cursor: pointer;
  outline: none;
  inset-inline: 0;
  margin-inline-start: 50%;
  transform: translateX(-50%);

  &:dir(rtl) {
    transform: translateX(50%);
  }
}

.mapboxgl-ctrl-group {
  background-color: var(--background);

  button {
    color: var(--color-slight);
  }

  &:not(empty) {
    box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 20%, transparent);
  }
}

.mapboxgl-ctrl-top-left {
  padding-top: var(--top-safe-area);

  &:dir(ltr) {
    padding-top: max(var(--top-safe-area), var(--sidebar-overlay-height, 0));
    padding-left: var(--sidebar-overlay-width, 0);
  }
}

.mapboxgl-ctrl-top-right {
  padding-top: var(--top-safe-area);

  &:dir(rtl) {
    padding-top: max(var(--top-safe-area), var(--sidebar-overlay-height, 0));
    padding-right: var(--sidebar-overlay-width, 0);
  }
}

.mapboxgl-ctrl-bottom-left,
.mapboxgl-ctrl-bottom-right {
  padding-bottom: var(--bottom-safe-area);
}

.mapboxgl-ctrl-top-right:dir(ltr),
.mapboxgl-ctrl-bottom-right:dir(ltr),
.mapboxgl-ctrl-top-left:dir(rtl),
.mapboxgl-ctrl-bottom-left:dir(rtl) {
  padding-left: var(--inline-end-safe-area);
}

/* Override colors of the fullscreen and compass controls to support dark mode */
.mapboxgl-ctrl-fullscreen .mapboxgl-ctrl-icon {
  background: currentColor;
  mask: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 29 29'%3E%3Cpath d='M24 16v5.5c0 1.75-.75 2.5-2.5 2.5H16v-1l3-1.5-4-5.5 1-1 5.5 4 1.5-3h1zM6 16l1.5 3 5.5-4 1 1-4 5.5 3 1.5v1H7.5C5.75 24 5 23.25 5 21.5V16h1zm7-11v1l-3 1.5 4 5.5-1 1-5.5-4L6 13H5V7.5C5 5.75 5.75 5 7.5 5H13zm11 2.5c0-1.75-.75-2.5-2.5-2.5H16v1l3 1.5-4 5.5 1 1 5.5-4 1.5 3h1V7.5z'/%3E%3C/svg%3E");
}

.mapboxgl-ctrl-compass .mapboxgl-ctrl-icon {
  background: currentColor;
  mask: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 29 29'%3E%3Cpath d='M10.5 14l4-8 4 8h-8z'/%3E%3Cpath id='south' d='M10.5 16l4 8 4-8h-8z' opacity='0.25'/%3E%3C/svg%3E");
}

.mapboxgl-ctrl-attrib {
  background-color: color-mix(in srgb, var(--background-pure) 50%, transparent);
}

.mapboxgl-ctrl-attrib a {
  color: inherit;
}

.mapboxgl-ctrl-attrib-button {
  background: var(--color);
  mask: url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg' fill-rule='evenodd'%3E%3Cpath d='M4 10a6 6 0 1 0 12 0 6 6 0 1 0-12 0m5-3a1 1 0 1 0 2 0 1 1 0 1 0-2 0m0 3a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0'/%3E%3C/svg%3E");
}
</style>
