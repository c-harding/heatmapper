<script lang="tsx">
import type { Map as MapboxMap } from 'mapbox-gl';

declare global {
  interface Window {
    cachedMapElement?: MapboxMap;
  }
}

// Set in vite.config.js
declare const MAPBOX_TOKEN: string;
</script>

<script setup lang="tsx">
import polyline from '@mapbox/polyline';
import type { MapItem } from '@strava-heatmapper/shared/interfaces';
import { useHead } from '@unhead/vue';
import type { LngLatBounds, LngLatLike, MapMouseEvent } from 'mapbox-gl';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { Toggle3DIconControl } from '@/Toggle3DIconControl';
import { addLayersToMap, applyMapItems, MapSourceLayer, useMapSelection } from '@/utils/map';

import type { MapStyle } from '../MapStyle';
import Viewport from '../Viewport';

defineExpose({ zoomToSelection });

useHead({
  link: [
    {
      href: 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css',
      rel: 'stylesheet',
    },
  ],
});

const mapboxgl = await import('mapbox-gl');

const map = ref<MapboxMap | undefined>();

const container = ref<HTMLElement>();

const token = MAPBOX_TOKEN;

const selectedMapItems = computed<MapItem[]>(() =>
  props.mapItems.filter((item) => props.selected.includes(item.id)),
);

const terrain = ref(false);

const onTerrain = () => {
  if (terrain.value) {
    if (!map.value?.getSource('mapbox-dem')) {
      map.value?.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      });
    }
    map.value?.setTerrain({ source: 'mapbox-dem' });
    map.value?.setProjection('globe');
  } else {
    map.value?.setTerrain(null);
    map.value?.setProjection('mercator');
  }
};

const props = withDefaults(
  defineProps<{
    center: LngLatLike;
    zoom: number;
    selected?: string[];
    mapItems: MapItem[];
    mapStyle: MapStyle;
  }>(),
  {
    selected: () => [],
  },
);

const emit = defineEmits<{
  (e: 'update:center', value: LngLatLike): void;
  (e: 'update:zoom', value: number): void;
  (e: 'update:selected', value: string[]): void;
}>();

watch(
  () => props.mapStyle,
  (style) => {
    if (map.value) {
      const loadedMap = map.value;
      loadedMap.setStyle(style);

      map.value.once('styledata', () => {
        mapLoaded(loadedMap);
        return onTerrain();
      });
    }
  },
);

watch(terrain, onTerrain);

watch(
  () => props.mapItems,
  (mapItems) => {
    if (map.value) applyMapItems(map.value, mapItems, MapSourceLayer.LINES);
  },
);

watch(selectedMapItems, (selectedMapItems) => {
  if (map.value) applyMapItems(map.value, selectedMapItems, MapSourceLayer.SELECTED);
});

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

function flyTo(mapItems: MapItem[], zoom = false): void {
  if (!map.value || mapItems.length === 0) return;
  const coordinates = mapItems.flatMap(({ map: line }) =>
    polyline.decode(line).map<[number, number]>(([y, x]) => [x, y]),
  );
  const bounds = coordinates.reduce(
    (acc, coord) => acc.extend(coord),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
  );

  const viewport = optimiseViewport(map.value, bounds);

  const screenNorthEast = map.value.unproject([
    viewport.width - viewport.offsets.right,
    viewport.offsets.top,
  ]);
  const screenSouthWest = map.value.unproject([
    viewport.offsets.left,
    viewport.height - viewport.offsets.bottom,
  ]);
  const screenBounds = new mapboxgl.LngLatBounds(screenSouthWest, screenNorthEast);

  if (
    zoom ||
    !screenBounds.contains(bounds.getSouthWest()) ||
    !screenBounds.contains(bounds.getNorthEast())
  ) {
    const maxZoom = zoom ? 30 : map.value.getZoom();
    map.value.fitBounds(bounds, {
      padding: viewport.offsets,
      linear: true,
      maxZoom,
    });
  }
}

function zoomToSelection(): void {
  flyTo(selectedMapItems.value, true);
}

const resizeHandler = () => map.value?.resize();

onMounted(() => {
  window.addEventListener('transitionend', resizeHandler, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('transitionend', resizeHandler);
});

async function mapLoaded(map: MapboxMap): Promise<void> {
  map.resize();

  addLayersToMap(map, props.mapStyle);
  onTerrain();

  await nextTick();
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

onMounted(() => {
  const map = addMapElement();

  map.on('zoomend', () => zoomend(map));
  map.on('moveend', () => moveend(map));
  map.on('click', (ev) => click(ev));
  map.on('dblclick', (ev) => dblclick(ev));
  map.once('idle', () => mapLoaded(map));
});

function addMapElement(): MapboxMap {
  let newMap: MapboxMap;
  const cachedMap = window.cachedMapElement;
  if (cachedMap) {
    container.value?.appendChild(cachedMap.getContainer());
    newMap = cachedMap;
  } else {
    newMap = new mapboxgl.Map({
      accessToken: token,
      container: 'mapbox',
      style: props.mapStyle,
      center: props.center,
      zoom: props.zoom,
    });

    const topCorner = document.dir === 'rtl' ? 'top-left' : 'top-right';

    newMap.addControl(new mapboxgl.FullscreenControl(), topCorner);
    newMap.addControl(
      new mapboxgl.NavigationControl({ showZoom: false, visualizePitch: true }),
      topCorner,
    );
    newMap.addControl(new Toggle3DIconControl(terrain), topCorner);
    newMap.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
  }
  map.value = newMap;

  window.cachedMapElement = newMap;
  return newMap;
}

function render() {
  return <div class="map-container">{!window.cachedMapElement && <div id="mapbox" />}</div>;
}
</script>

<template>
  <render ref="container" />
</template>

<style>
.map-container {
  display: contents;
}

#mapbox {
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
</style>
