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
import { useHead } from '@unhead/vue';
import type { GeoJSON } from 'geojson';
import { LngLatBounds } from 'mapbox-gl';
import type { VNode } from 'vue';
import { computed, ref } from 'vue';
import { nextTick, onMounted, watch } from 'vue';

import { MapStyle } from '../MapStyle';

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

interface LayerDef {
  source: string;
  color: mapboxgl.Expression | string;
  width: mapboxgl.Expression | number;
}

const sources = ['lines', 'selected'];
const width = fromZoom([5, 1], [14, 4], [22, 8]);
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

    width,
  },
  medium: {
    source: 'lines',
    color: colorOpacityFromZoom(
      style === MapStyle.STRAVA ? [F, 0, 0] : [F, 0, F],
      [5, 0.2],
      [10, 0.08],
    ),
    width,
  },
  hot: {
    source: 'lines',
    color: colorOpacityFromZoom(
      style === MapStyle.STRAVA ? [F, F, 0] : [F, 0, F],
      [5, 0.1],
      [10, 0.04],
    ),

    width,
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

const selectedActivities = computed<Activity[]>(() => {
  return props.activities.filter((activity) => props.selected.includes(activity.id));
});

const localSelected = ref<number[]>([]);

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
    selected?: number[];
    activities: Activity[];
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
  (e: 'update:selected', value: number[]): void;
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
  () => props.activities,
  (activities) => {
    applyActivities(activities, 'lines');
  },
);

watch(selectedActivities, (selectedActivities) => {
  applyActivities(selectedActivities, 'selected');
});

watch(
  () => props.selected,
  () => {
    nextTick(() => {
      if (props.selected !== localSelected.value) {
        localSelected.value = props.selected;
        flyTo(selectedActivities.value);
      }
    });
  },
);

function flyTo(activities: Activity[], zoom = false): void {
  const padding = 20;

  if (!map.value || activities.length === 0) return;
  const coordinates = activities.flatMap(({ map: line }) =>
    polyline.decode(line).map<[number, number]>(([y, x]) => [x, y]),
  );
  const bounds = coordinates.reduce(
    (acc, coord) => acc.extend(coord),
    new LngLatBounds(coordinates[0], coordinates[0]),
  );
  const { width, height } = map.value.getCanvas().getBoundingClientRect();
  const screenNorthEast = map.value.unproject([width - padding, padding]);
  const screenSouthWest = map.value.unproject([padding, height - padding]);
  const screenBounds = new LngLatBounds(screenSouthWest, screenNorthEast);
  if (
    zoom ||
    !screenBounds.contains(bounds.getSouthWest()) ||
    !screenBounds.contains(bounds.getNorthEast())
  ) {
    const maxZoom = zoom ? 30 : map.value.getZoom();
    map.value.fitBounds(bounds, {
      padding,
      linear: true,
      maxZoom,
    });
  }
}

function zoomToSelection(): void {
  flyTo(selectedActivities.value, true);
}

function applyActivities(next: Activity[], sourceID: string): void {
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
  applyActivities(props.activities, 'lines');
  applyActivities(selectedActivities.value, 'selected');
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
}
</style>
