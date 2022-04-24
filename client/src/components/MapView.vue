<script lang="tsx">
import mapboxgl from 'mapbox-gl';

declare global {
  interface Window {
    cachedMapElement?: mapboxgl.Map;
  }
}
</script>

<script setup lang="tsx">
import polyline from '@mapbox/polyline';
import type Activity from '@strava-heatmapper/shared/interfaces/Activity';
import { useHead } from '@vueuse/head';
import type { GeoJSON } from 'geojson';
import { LngLatBounds } from 'mapbox-gl';
import type { VNode } from 'vue';
import { nextTick, onMounted, watch } from 'vue';
import { $$, $computed, $ref } from 'vue/macros';

const fromZoom = (...pairs: [number, number][]): mapboxgl.Expression => [
  'interpolate',
  ['linear'],
  ['zoom'],
  ...pairs.flatMap(([zoomLevel, value]) => [zoomLevel, value]),
];

const makeGeoJsonData = (activities: Activity[] = []): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: activities
    .filter((activity) => activity.map)
    .map((activity) => ({
      type: 'Feature',
      id: activity.id,
      properties: null,
      geometry: polyline.toGeoJSON(activity.map),
    })),
});

const makeGeoJson = (activities = []): mapboxgl.GeoJSONSourceRaw => ({
  type: 'geojson',
  data: makeGeoJsonData(activities),
});

const sources = ['lines', 'selected'];
const width = fromZoom([5, 1], [14, 4], [22, 8]);
const selectedWidth = fromZoom([5, 4], [14, 8]);
const layers = {
  lines: {
    source: 'lines',
    color: '#00F',
    opacity: fromZoom([5, 0.75], [10, 0.35]),
    width,
  },
  medium: {
    source: 'lines',
    color: '#F00',
    opacity: fromZoom([5, 0.2], [10, 0.08]),
    width,
  },
  hot: {
    source: 'lines',
    color: '#FF0',
    opacity: fromZoom([5, 0.1], [10, 0.04]),
    width,
  },
  selected: {
    source: 'selected',
    color: '#0CF',
    opacity: 1,
    width: selectedWidth,
  },
};

type LayerDef = typeof layers[keyof typeof layers];

const buildLineLayer = (id: string, layer: LayerDef): mapboxgl.AnyLayer => ({
  id,
  type: 'line',
  source: layer.source,
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': layer.color,
    'line-opacity': layer.opacity,
    'line-width': layer.width,
  },
});

useHead({
  link: [
    {
      href: 'https://api.mapbox.com/mapbox-gl-js/v1.11.0/mapbox-gl.css',
      rel: 'stylesheet',
    },
  ],
});

let map = $ref<mapboxgl.Map | undefined>();

const container = $ref<HTMLDivElement>();

const token = $ref(
  'pk.eyJ1IjoiY2hhcmRpbmciLCJhIjoiY2tiYWp0cndkMDc0ZjJybXhlcHdoM2Z3biJ9.XUwOLV17ZBXE8dhp198dqg',
);

const mapStyle = $ref('mapbox://styles/charding/ckbfof39h4b2t1ildduhwlm15');

const selectedActivities: Activity[] = $computed(() => {
  return activities.filter((activity) => selected.includes(activity.id));
});

let localSelected: number[] = $ref([]);

const {
  center,
  zoom,
  selected = [],
  activities,
} = defineProps<{
  center: mapboxgl.LngLatLike;
  zoom: number;
  selected?: number[];
  activities: Activity[];
}>();

const emit = defineEmits<{
  (e: 'update:center', value: mapboxgl.LngLatLike): void;
  (e: 'update:zoom', value: number): void;
  (e: 'update:selected', value: number[]): void;
}>();

watch($$(mapStyle), (style) => {
  map?.setStyle(style);
});

watch($$(activities), (activities) => {
  applyActivities(activities, 'lines');
});

watch($$(selectedActivities), (selectedActivities) => {
  applyActivities(selectedActivities, 'selected');
});

watch($$(selected), () => {
  nextTick(() => {
    if (selected !== localSelected) {
      localSelected = selected;
      flyTo(selectedActivities);
    }
  });
});

function flyTo(activities: Activity[], zoom = false): void {
  const padding = 20;

  if (!map || activities.length === 0) return;
  const coordinates = activities.flatMap(({ map: line }) =>
    polyline.decode(line).map<[number, number]>(([y, x]) => [x, y]),
  );
  const bounds = coordinates.reduce(
    (acc, coord) => acc.extend(coord),
    new LngLatBounds(coordinates[0], coordinates[0]),
  );
  const { width, height } = map.getCanvas().getBoundingClientRect();
  const screenNorthEast = map.unproject([width - padding, padding]);
  const screenSouthWest = map.unproject([padding, height - padding]);
  const screenBounds = new LngLatBounds(screenSouthWest, screenNorthEast);
  if (
    zoom ||
    !screenBounds.contains(bounds.getSouthWest()) ||
    !screenBounds.contains(bounds.getNorthEast())
  ) {
    const maxZoom = zoom ? 30 : map.getZoom();
    map.fitBounds(bounds, {
      padding,
      linear: true,
      maxZoom,
    });
  }
}

function zoomToSelection(): void {
  flyTo(selectedActivities, true);
}

function applyActivities(next: Activity[], sourceID: string): void {
  const source = map?.getSource(sourceID);
  (source as mapboxgl.GeoJSONSource)?.setData(makeGeoJsonData(next));
}

async function mapLoaded(map: mapboxgl.Map): Promise<void> {
  map.resize();

  sources.forEach((id) => map.addSource(id, makeGeoJson()));
  Object.entries(layers).forEach(([id, layer]) => map.addLayer(buildLineLayer(id, layer)));

  await nextTick();
  applyActivities(activities, 'lines');
  applyActivities(selectedActivities, 'selected');
}

function click(map: mapboxgl.Map, e: mapboxgl.MapMouseEvent): void {
  const surround = (
    point: mapboxgl.Point,
    offset: number,
  ): [mapboxgl.PointLike, mapboxgl.PointLike] => [
    [point.x - offset, point.y + offset],
    [point.x + offset, point.y - offset],
  ];
  for (let i = 0; i < 5; i += 1) {
    const neighbours = map.queryRenderedFeatures(surround(e.point, i), {
      layers: ['lines', 'selected'],
    });
    if (neighbours.length > 0) {
      select(neighbours[neighbours.length - 1].id as number);
      return;
    }
  }
  select();
}

function select(id?: number): void {
  const selected = id !== undefined ? [id] : [];
  localSelected = selected;
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
  map.on('load', () => mapLoaded(map));
});

function addMapElement(): mapboxgl.Map {
  let newMap: mapboxgl.Map;
  const cachedMap = window.cachedMapElement;
  if (cachedMap) {
    container.appendChild(cachedMap.getContainer());
    newMap = cachedMap;
  } else {
    newMap = new mapboxgl.Map({
      accessToken: token,
      container: 'mapbox',
      style: mapStyle,
      center,
      zoom,
    });
    newMap.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    newMap.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
  }
  map = newMap;

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
}
</style>
