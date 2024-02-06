<script lang="tsx">
import mapboxgl from 'mapbox-gl';

declare global {
  interface Window {
    cachedMapElement?: mapboxgl.Map;
  }
}

type Properties = { id: string };
</script>

<script setup lang="tsx">
import polyline from '@mapbox/polyline';
import type { MapItem } from '@strava-heatmapper/shared/interfaces';
import { useHead } from '@unhead/vue';
import type { GeoJSON } from 'geojson';
import { LngLatBounds } from 'mapbox-gl';
import type { VNode } from 'vue';
import { computed, onBeforeUnmount, ref } from 'vue';
import { nextTick, onMounted, watch } from 'vue';

import { MapStyle } from '../MapStyle';
import Viewport from '../Viewport';

const colorOpacityFromZoom = (
  [r, g, b]: [r: number, g: number, b: number],
  ...pairs: [zoom: number, opacity: number][]
): mapboxgl.Expression =>
  fromZoom(...pairs.map(([zoom, a]) => [zoom, ['rgba', r, g, b, a]] as const));

const fromZoom = (...pairs: (readonly [zoom: number, value: unknown])[]): mapboxgl.Expression => [
  'interpolate',
  ['linear'],
  ['zoom'],
  ...pairs.flatMap(([zoomLevel, value]) => [zoomLevel, value]),
];

const makeGeoJsonData = (
  mapItems: MapItem[] = [],
): GeoJSON.FeatureCollection<GeoJSON.LineString, Properties> => ({
  type: 'FeatureCollection',
  features: mapItems
    .filter((item) => item.map)
    .map<GeoJSON.Feature<GeoJSON.LineString, Properties>>((item) => ({
      type: 'Feature',
      properties: {
        id: item.id,
      },
      geometry: polyline.toGeoJSON(item.map),
    })),
});

const makeGeoJson = (mapItems: MapItem[] = []): mapboxgl.GeoJSONSourceRaw => ({
  type: 'geojson',
  data: makeGeoJsonData(mapItems),
});

interface LayerDef {
  source: string;
  color: mapboxgl.Expression | string;
  width: mapboxgl.Expression | number;
}

const sources = ['lines', 'selected'];
const lineWidth = fromZoom([5, 1], [14, 4], [22, 8]);
const selectedWidth = fromZoom([5, 4], [14, 8]);
const F = 255;
const layers = (style: MapStyle): Record<'lines' | 'medium' | 'hot' | 'selected', LayerDef> => ({
  lines: {
    source: 'lines',

    color: colorOpacityFromZoom(
      style === MapStyle.STRAVA ? [0, 0, F] : [F, 0, F],
      [5, 0.75],
      [10, 0.35],
    ),

    width: lineWidth,
  },
  medium: {
    source: 'lines',
    color: colorOpacityFromZoom(
      style === MapStyle.STRAVA ? [F, 0, 0] : [F, 0, F],
      [5, 0.2],
      [10, 0.08],
    ),
    width: lineWidth,
  },
  hot: {
    source: 'lines',
    color: colorOpacityFromZoom(
      style === MapStyle.STRAVA ? [F, F, 0] : [F, 0, F],
      [5, 0.1],
      [10, 0.04],
    ),
    width: lineWidth,
  },
  selected: {
    source: 'selected',
    color: '#0CF',
    width: selectedWidth,
  },
});

const buildLineLayer = (id: string, layer: LayerDef): mapboxgl.AnyLayer => ({
  id,
  type: 'line',
  source: layer.source,
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': layer.color,
    'line-width': layer.width,
  },
});

useHead({
  link: [
    {
      href: 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css',
      rel: 'stylesheet',
    },
  ],
});

const map = ref<mapboxgl.Map | undefined>();

const container = ref<HTMLDivElement>();

const token = ref(
  'pk.eyJ1IjoiY2hhcmRpbmciLCJhIjoiY2tiYWp0cndkMDc0ZjJybXhlcHdoM2Z3biJ9.XUwOLV17ZBXE8dhp198dqg',
);

const selectedMapItems = computed<MapItem[]>(() =>
  props.mapItems.filter((item) => props.selected.includes(item.id)),
);

const localSelected = ref<string[]>([]);

const onTerrain = () => {
  if (props.terrain) {
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
    center: mapboxgl.LngLatLike;
    zoom: number;
    selected?: string[];
    mapItems: MapItem[];
    terrain?: boolean;
    mapStyle: MapStyle;
  }>(),
  {
    selected: () => [],
    terrain: false,
  },
);

const emit = defineEmits<{
  (e: 'update:center', value: mapboxgl.LngLatLike): void;
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

watch(() => props.terrain, onTerrain);

watch(
  () => props.mapItems,
  (mapItems) => {
    applyMapItems(mapItems, 'lines');
  },
);

watch(selectedMapItems, (selectedMapItems) => {
  applyMapItems(selectedMapItems, 'selected');
});

watch(
  () => props.selected,
  () => {
    nextTick(() => {
      if (props.selected !== localSelected.value) {
        localSelected.value = props.selected;
        flyTo(selectedMapItems.value);
      }
    });
  },
);

/**
 * Calculate best way of zooming to fit the activity while avoiding the controls in the corners.
 *
 * This works by considering the visual aspect ratio of the route, and for each corner control,
 * considering either placing the route strictly horizontally offset from the control or strictly
 * vertically offset from the control.
 *
 * It compares the area of the bounding box of the activity in each case.
 */
function optimiseViewport(map: mapboxgl.Map, bounds: LngLatBounds) {
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
    .flatMap((viewport) =>
      [{ top: topLeft?.clientHeight }, { left: topLeft?.clientWidth ?? 0 }].map((offset) =>
        viewport.withOffset(offset),
      ),
    )
    .flatMap((viewport) =>
      [{ bottom: bottomLeft?.clientHeight }, { left: bottomLeft?.clientWidth ?? 0 }].map((offset) =>
        viewport.withOffset(offset),
      ),
    )
    .flatMap((viewport) =>
      [{ top: topRight?.clientHeight }, { right: topRight?.clientWidth ?? 0 }].map((offset) =>
        viewport.withOffset(offset),
      ),
    )
    .flatMap((viewport) =>
      [{ bottom: bottomRight?.clientHeight }, { right: bottomRight?.clientWidth ?? 0 }].map(
        (offset) =>
          // Add padding once for every entry, after applying the bottom right offset
          viewport.withOffset(offset).withPadding(padding),
      ),
    );

  return viewports.reduce((best, current) =>
    best.screenArea(aspectRatio) > current.screenArea(aspectRatio) ? best : current,
  );
}

function flyTo(mapItems: MapItem[], zoom = false): void {
  const padding = 20;

  if (!map.value || mapItems.length === 0) return;
  const coordinates = mapItems.flatMap(({ map: line }) =>
    polyline.decode(line).map<[number, number]>(([y, x]) => [x, y]),
  );
  const bounds = coordinates.reduce(
    (acc, coord) => acc.extend(coord),
    new LngLatBounds(coordinates[0], coordinates[0]),
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
  const screenBounds = new LngLatBounds(screenSouthWest, screenNorthEast);

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

function applyMapItems(next: MapItem[], sourceID: string): void {
  const source = map.value?.getSource(sourceID);
  (source as mapboxgl.GeoJSONSource)?.setData(makeGeoJsonData(next));
}

async function mapLoaded(map: mapboxgl.Map): Promise<void> {
  map.resize();

  sources.forEach((id) => map.addSource(id, makeGeoJson()));
  Object.entries(layers(props.mapStyle)).forEach(([id, layer]) =>
    map.addLayer(buildLineLayer(id, layer)),
  );
  onTerrain();

  await nextTick();
  applyMapItems(props.mapItems, 'lines');
  applyMapItems(selectedMapItems.value, 'selected');
}

function surround(point: mapboxgl.Point, offset: number): [mapboxgl.PointLike, mapboxgl.PointLike] {
  return [
    [point.x - offset, point.y + offset],
    [point.x + offset, point.y - offset],
  ];
}

function click(map: mapboxgl.Map, e: mapboxgl.MapMouseEvent): void {
  // Ignore duplicate clicks
  if (e.originalEvent.detail > 1) return;

  for (let i = 0; i < 5; i += 1) {
    const neighbours = map.queryRenderedFeatures(surround(e.point, i), {
      layers: ['lines', 'selected'],
    });
    if (neighbours.length > 0) {
      select((neighbours[neighbours.length - 1].properties as Properties).id);
      return;
    }
  }
  select();
}

function dblclick(e: mapboxgl.MapMouseEvent): void {
  if (localSelected.value.length !== 0) {
    e.preventDefault();
    nextTick(() => zoomToSelection());
  }
}

function select(id?: string): void {
  const selected = id !== undefined ? [id] : [];
  localSelected.value = selected;
  emit('update:selected', selected);
}

function zoomend(map: mapboxgl.Map): void {
  emit('update:zoom', map.getZoom());
}

function moveend(map: mapboxgl.Map) {
  emit('update:center', map.getCenter());
}

onMounted(() => {
  const map = addMapElement();

  map.on('zoomend', () => zoomend(map));
  map.on('moveend', () => moveend(map));
  map.on('click', (ev) => click(map, ev));
  map.on('dblclick', (ev) => dblclick(ev));
  map.once('idle', () => mapLoaded(map));
});

function addMapElement(): mapboxgl.Map {
  let newMap: mapboxgl.Map;
  const cachedMap = window.cachedMapElement;
  if (cachedMap) {
    container.value?.appendChild(cachedMap.getContainer());
    newMap = cachedMap;
  } else {
    newMap = new mapboxgl.Map({
      accessToken: token.value,
      container: 'mapbox',
      style: props.mapStyle,
      center: props.center,
      zoom: props.zoom,
    });

    newMap.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    newMap.addControl(
      new mapboxgl.NavigationControl({ showZoom: false, visualizePitch: true }),
      'top-right',
    );
    newMap.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
  }
  map.value = newMap;

  window.cachedMapElement = newMap;
  return newMap;
}

function render(): VNode {
  nextTick(() => addMapElement());
  return <div class="map-container">{!window.cachedMapElement && <div id="mapbox" />}</div>;
}

defineExpose({ zoomToSelection });
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
  left: 0;
  right: 0;
  margin-left: 50%;
  transform: translateX(-50%);
}

.mapboxgl-ctrl-top-right {
  padding-top: var(--top-safe-area);
}

.mapboxgl-ctrl-top-right {
  padding-top: var(--top-safe-area);
}

.mapboxgl-ctrl-top-left {
  padding-top: max(var(--top-safe-area), var(--sidebar-overlay-height, 0));
  padding-left: var(--sidebar-overlay-width, 0);
}

.mapboxgl-ctrl-bottom-left,
.mapboxgl-ctrl-bottom-right {
  padding-bottom: var(--bottom-safe-area);
}

.mapboxgl-ctrl-top-right,
.mapboxgl-ctrl-bottom-right {
  padding-right: var(--right-safe-area);
}
</style>
