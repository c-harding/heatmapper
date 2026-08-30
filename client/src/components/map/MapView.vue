<script lang="tsx">
import {
  type LngLatBounds,
  type LngLatLike,
  type Map as MapboxMap,
  type MapMouseEvent,
  type StyleSpecification,
} from 'mapbox-gl';

import { useSelectionStore } from '@/stores/SelectionStore';
import config from '@/utils/config';

import PickerControl from './PickerControl.vue';

declare global {
  interface Window {
    cachedMapElement?: MapboxMap;
  }
}

/** Whether the user has taken control of the map, after which it must not be moved under them */
let userMoved = false;
</script>

<script setup lang="tsx">
import polyline from '@mapbox/polyline';
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { FALLBACK_STYLE, resolveStyle, useMapStyle } from '@/MapStyle';
import {
  addControl,
  addLayersToMap,
  applyMapItems,
  MapSourceLayer,
  useMapSelection,
} from '@/utils/map';
import { getBestCenter } from '@/utils/midpoint';
import Viewport from '@/Viewport';

const center = defineModel<LngLatLike>('center', { required: true });
const zoom = defineModel<number>('zoom', { required: true });

const { minimisedSidebar, cardShown } = defineProps<{
  minimisedSidebar: boolean;
  cardShown: boolean;
}>();

defineExpose({ zoomToSelection });

const selectionStore = useSelectionStore();

const { default: mapboxgl } = await import('mapbox-gl');

if (mapboxgl.getRTLTextPluginStatus() === 'unavailable') {
  mapboxgl.setRTLTextPlugin(
    '/mapbox-gl-rtl-text.js',
    () => undefined,
    true, // Lazy load the plugin only when text is in arabic
  );
}

const container = ref<HTMLElement>();

const { mapStyleUrl, mapChoice, mapStyle, mapStyleChoices, rememberStyle } = useMapStyle();

/**
 * The style to hand to mapbox-gl, falling back where one will not load.
 *
 * A Suspense with nothing to show in its place awaits this component, and the style picker is
 * inside it, so a style that throws here would take the map and the means of choosing another one
 * down together. Fall back to a style Mapbox host, which needs no fetching of ours.
 *
 * @param url the style to load
 * @returns that style, or the fallback, having moved the choice to match
 */
async function styleOrFallback(url: string): Promise<string | StyleSpecification> {
  try {
    return await resolveStyle(url);
  } catch (error) {
    console.error(`Could not load the map style ${url}`, error);
    mapChoice.value = FALLBACK_STYLE;
    return mapStyleUrl.value;
  }
}

const terrain = ref(false);

const KEEP_OUT = 'data-keep-out';

/** A container for map widgets, which getViewports keeps routes clear of. */
function keepOutSlot(parent: HTMLElement, className: string): HTMLElement {
  const slot = parent.appendChild(document.createElement('div'));
  slot.className = className;
  slot.setAttribute(KEEP_OUT, '');
  return slot;
}

const topCorner = document.dir === 'rtl' ? 'top-left' : 'top-right';

if (!window.cachedMapElement) {
  const newMap = new mapboxgl.Map({
    accessToken: config.MAPBOX_TOKEN,
    container: document.body.appendChild(document.createElement('div')),
    style: await styleOrFallback(mapStyleUrl.value),
    center: center.value,
    zoom: zoom.value,
    attributionControl: false,
  });

  newMap.addControl(new mapboxgl.FullscreenControl(), topCorner);
  newMap.addControl(
    new mapboxgl.NavigationControl({ showZoom: false, visualizePitch: true }),
    topCorner,
  );

  newMap.addControl(
    new mapboxgl.GeolocateControl({
      trackUserLocation: true,
      showUserHeading: true,
    }),
  );

  const bottomStack = document.createElement('div');
  bottomStack.className = 'map-bottom-stack';
  newMap.getContainer().querySelector('.mapboxgl-control-container')?.append(bottomStack);

  const startSlot = keepOutSlot(bottomStack, 'map-bottom-start');
  addControl(newMap, startSlot, new mapboxgl.ScaleControl());
  addControl(
    newMap,
    keepOutSlot(bottomStack, 'map-bottom-end'),
    new mapboxgl.AttributionControl({ compact: true }),
  );
  keepOutSlot(bottomStack, 'map-footer').setAttribute('aria-live', 'polite');

  // The Map constructor adds this one, so its element is in a corner rather than staged
  const logo = newMap.getContainer().querySelector('.mapboxgl-ctrl-logo')?.parentElement;
  if (logo) startSlot.append(logo);

  newMap
    .getContainer()
    .querySelectorAll('.mapboxgl-ctrl-top-left, .mapboxgl-ctrl-top-right')
    .forEach((corner) => corner.setAttribute(KEEP_OUT, ''));

  window.cachedMapElement = newMap;
}

const map = window.cachedMapElement;

onMounted(() => {
  container.value?.appendChild(map.getContainer());
  map.resize();
  applyDefaultPosition();
});

watch([() => selectionStore.visibleItems], ([mapItems], [previousMapItems]) => {
  applyMapItems(map, mapItems, MapSourceLayer.LINES);
  if (!previousMapItems.length) applyDefaultPosition();
});

map.on('movestart', ({ originalEvent: userEvent }) => {
  if (userEvent) userMoved = true;
});

/** Open the map on the square holding the most paths, unless the user has taken control of it. */
function applyDefaultPosition(): void {
  if (userMoved || !container.value) return;
  const bounds = getBestCenter(selectionStore.visibleItems);
  if (bounds) map.fitBounds(bounds, { animate: false });
}

watch([() => selectionStore.visibleBackgroundItems], ([backgroundMapItems]) => {
  applyMapItems(map, backgroundMapItems, MapSourceLayer.BACKGROUND);
});

watch([() => selectionStore.selectedItems], ([selectedMapItems]) => {
  applyMapItems(map, selectedMapItems, MapSourceLayer.SELECTED);
});

watch(mapStyleUrl, async (styleUrl) => {
  const style = await styleOrFallback(styleUrl);
  // Another style may have been picked while this one was being fetched, and it wins.
  if (mapStyleUrl.value !== styleUrl) return;

  map.setStyle(style);
  map.once('styledata', () => {
    mapLoaded(map);
    rememberStyle();
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
 * Measure with every fold run to its end, so a fly that starts mid-fold aims at the layout it will
 * land in rather than the one it is leaving.
 *
 * Seeking a transition to its end finishes it, which drops it from getAnimations, so the list is
 * taken first; putting the times back un-finishes it and fires nothing. Both halves have to run in
 * one task, ahead of the frame that would dispatch transitionend, so nothing here may await.
 */
function atRest<T>(measure: () => T): T {
  const animations = (container.value?.getAnimations({ subtree: true }) ?? []).filter((animation) =>
    Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)),
  );
  const times = animations.map((animation) => animation.currentTime);

  for (const animation of animations) {
    animation.currentTime = Number(animation.effect?.getComputedTiming().endTime);
  }
  try {
    return measure();
  } finally {
    for (const [index, animation] of animations.entries()) {
      animation.currentTime = times[index];
    }
  }
}

/**
 * Run `measure` with the card shown, so the space it will take is reserved even where it is stowed
 * — double-tapping a row in the list frames a route while the sidebar is open and the card is not.
 *
 * Dropping the class starts the same transitions a fold would, which atRest then seeks to their
 * end; the same rules apply, so nothing here may await.
 */
function asShown<T>(measure: () => T): T {
  const element = container.value;
  const shown = element?.classList.contains('card-shown') ?? false;

  if (!shown) element?.classList.add('card-shown');
  try {
    return atRest(measure);
  } finally {
    if (!shown) element?.classList.remove('card-shown');
  }
}

/**
 * Calculate all ways of zooming to fit the activity while avoiding the controls in the corners.
 *
 * This works by considering the visual aspect ratio of the route, and for each corner control,
 * considering either placing the route strictly horizontally offset from the control or strictly
 * vertically offset from the control.
 */
function getViewports() {
  const padding = 10;

  const canvas = map.getCanvas().getBoundingClientRect();
  const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

  // How far in from each edge a route must come to clear each widget, and which way it can pass it
  const keepOut = [...(container.value?.querySelectorAll(`[${KEEP_OUT}]`) ?? [])]
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => ({
      top: clamp(rect.bottom - canvas.top, canvas.height),
      bottom: clamp(canvas.bottom - rect.top, canvas.height),
      left: clamp(rect.right - canvas.left, canvas.width),
      right: clamp(canvas.right - rect.left, canvas.width),
      atTop: rect.top - canvas.top < canvas.bottom - rect.bottom,
      atStart: rect.left - canvas.left < canvas.right - rect.right,
      blocksWidth: rect.width / canvas.width > 0.5,
    }));

  return keepOut
    .reduce(
      (viewports, widget) =>
        viewports.flatMap((viewport) => {
          const clearedBlock = viewport.withOffset(
            widget.atTop ? { top: widget.top } : { bottom: widget.bottom },
          );
          if (widget.blocksWidth) return [clearedBlock];
          const clearedInline = viewport.withOffset(
            widget.atStart ? { left: widget.left } : { right: widget.right },
          );
          return [clearedBlock, clearedInline];
        }),
      // Padding is given here as well as at the end so that 2 × padding is maintained from the
      // edges, and 1 × padding is maintained from the widgets
      [
        new Viewport(canvas.width, canvas.height, {
          left: padding,
          top: padding,
          bottom: padding,
          right: padding,
        }),
      ],
    )
    .map((viewport) => viewport.withPadding(padding));
}

/**
 * Given a list of viewports, find the one with the largest area.
 */
function getOptimalViewport(viewports: Viewport[], bounds: LngLatBounds) {
  const northWest = mapboxgl.MercatorCoordinate.fromLngLat(bounds.getNorthWest());
  const southEast = mapboxgl.MercatorCoordinate.fromLngLat(bounds.getSouthEast());

  const aspectRatio = (northWest.y - southEast.y) / (northWest.x - southEast.x);

  return viewports.reduce((best, current) =>
    best.screenArea(aspectRatio) > current.screenArea(aspectRatio) ? best : current,
  );
}

function checkBoundsForViewport(viewport: Viewport, bounds: LngLatBounds) {
  const screenNorthEast = map.unproject([
    viewport.width - (viewport.offsets.right ?? 0),
    viewport.offsets.top ?? 0,
  ]);
  const screenSouthWest = map.unproject([
    viewport.offsets.left ?? 0,
    viewport.height - (viewport.offsets.bottom ?? 0),
  ]);
  const screenBounds = new mapboxgl.LngLatBounds(screenSouthWest, screenNorthEast);
  return (
    screenBounds.contains(bounds.getSouthWest()) && screenBounds.contains(bounds.getNorthEast())
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

  const viewports = asShown(getViewports);

  if (!zoom && viewports.some((viewport) => checkBoundsForViewport(viewport, bounds))) {
    // If one of the viewports fits on the screen, there is no need to rezoom
    return;
  }

  const viewport = getOptimalViewport(viewports, bounds);

  map.fitBounds(bounds, {
    padding: viewport.offsets,
    linear: true,
    maxZoom: zoom ? 30 : map.getZoom(),
  });
}

function zoomToSelection(): void {
  flyTo(selectionStore.selectedItems, true);
}

const resizeHandler = () => map.resize();

/** Force the map to full width temporarily and trigger a map rerender at the new width. */
function presizeToFolded() {
  const container = map.getContainer();

  // Already as wide as it gets, so nothing is about to open up beside it
  if (container.clientWidth >= document.documentElement.clientWidth) return;

  const flex = container.style.flex;
  container.style.flex = '0 0 100vw';
  map.resize();
  container.style.flex = flex;
}

watch(
  () => minimisedSidebar,
  (isMinimised) => {
    if (isMinimised) presizeToFolded();
  },
);

onMounted(() => {
  window.addEventListener('transitionend', resizeHandler, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('transitionend', resizeHandler);
});

function mapLoaded(map: MapboxMap): void {
  map.resize();

  addLayersToMap(map, mapStyle.value);
  onTerrain();

  applyMapItems(map, selectionStore.visibleBackgroundItems, MapSourceLayer.BACKGROUND);
  applyMapItems(map, selectionStore.visibleItems, MapSourceLayer.LINES);
  applyMapItems(map, selectionStore.selectedItems, MapSourceLayer.SELECTED);
}

function dblclick(e: MapMouseEvent) {
  if (selectionStore.selectedItems.length !== 0) {
    e.preventDefault();
    nextTick(() => {
      zoomToSelection();
    });
  }
}

function zoomend(map: MapboxMap): void {
  zoom.value = map.getZoom();
}

function moveend(map: MapboxMap) {
  center.value = map.getCenter();
}

const { click } = useMapSelection({
  flyToSelection: () => {
    flyTo(selectionStore.selectedItems, false);
  },
});

const buttonTarget = map.getContainer().querySelector(`.mapboxgl-ctrl-${topCorner}`);

const footerTarget = map.getContainer().querySelector('.map-footer');

map.on('zoomend', () => {
  zoomend(map);
});
map.on('moveend', () => {
  moveend(map);
});
map.on('click', (ev) => {
  click(ev);
});
map.on('dblclick', (ev) => {
  dblclick(ev);
});
map.once('idle', () => {
  mapLoaded(map);
});
</script>

<template>
  <div
    ref="container"
    :class="['map-container', !minimisedSidebar && 'sidebar-expanded', cardShown && 'card-shown']"
  />
  <Teleport :to="buttonTarget">
    <div class="mapboxgl-ctrl mapboxgl-ctrl-group">
      <button @click="terrain = !terrain">
        {{ terrain ? '2D' : '3D' }}
      </button>
    </div>

    <div class="mapboxgl-ctrl mapboxgl-ctrl-group">
      <PickerControl v-model="mapChoice" :choices="mapStyleChoices" />
    </div>
  </Teleport>
  <Teleport :to="footerTarget">
    <slot name="bottom" />
  </Teleport>
</template>

<style lang="scss">
@use '@/styles/breakpoints';
@use '@/styles/sidebar';

@import 'mapbox-gl/dist/mapbox-gl.css' layer(mapbox);

$widget-gap: 10px;

.map-container {
  @include sidebar.metrics('.sidebar-expanded');

  display: contents;
}

.mapboxgl-map {
  flex: 1;
  z-index: 0;
}

.mapboxgl-canvas-container {
  display: flex;
  justify-content: center;
}

.mapboxgl-canvas {
  position: unset;
  cursor: pointer;
  outline: none;
  inset-inline: 0;

  &:dir(rtl) {
    transform: translateX(50%);
  }
}

.mapboxgl-ctrl-group {
  background-color: var(--background-full);

  button {
    color: var(--color-strong);
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

/* Only the inline-end corner: the sidebar covers the window's inline-start edge. */
.mapboxgl-ctrl-top-right:dir(ltr),
.mapboxgl-ctrl-top-left:dir(rtl) {
  padding-inline-end: var(--inline-end-safe-area);
}

/* The corner holding our own widgets. */
.mapboxgl-ctrl-top-right:dir(ltr),
.mapboxgl-ctrl-top-left:dir(rtl) {
  transition: opacity var(--transition-speed);
}

/* Below the breakpoint the expanded sidebar covers the map, putting these out of reach. */
@include breakpoints.over-the-map {
  .map-container.sidebar-expanded .mapboxgl-ctrl-top-right:dir(ltr),
  .map-container.sidebar-expanded .mapboxgl-ctrl-top-left:dir(rtl) {
    opacity: 0;
  }
}

.map-bottom-stack {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  z-index: 2;
  pointer-events: none;

  --fade-speed: calc(var(--transition-speed) / 2);

  display: grid;
  grid-template-columns: auto 1fr;
  // minmax(0, 1fr) allows scaling to zero, which a bare 1fr would not
  grid-template-rows: auto minmax(0, 0fr);
  grid-template-areas:
    'inlineStart inlineEnd'
    'footer footer';
  transition: grid-template-rows var(--transition-speed) var(--transition-ease);

  padding-inline: var(--inline-start-safe-area) var(--inline-end-safe-area);
  padding-block-end: var(--bottom-safe-area);

  .map-container.card-shown & {
    grid-template-rows: auto minmax(0, 1fr);
  }
}

.map-bottom-start,
.map-bottom-end {
  display: flex;
  flex-direction: column;
  align-self: end;
}

.map-bottom-start {
  grid-area: inlineStart;
  justify-self: start;
  align-items: start;
}

.map-bottom-end {
  grid-area: inlineEnd;
  justify-self: end;
  align-items: end;
}

.map-footer {
  grid-area: footer;
  display: grid;
  overflow: clip;

  // Reset the mapbox-provided font
  font-family: var(--font-family);
  font-size: 1rem;
  line-height: normal;
}

// Beside the map the card takes the start column, at the width the sidebar gives its row, and the
// attribution spans both rows so only the scale bar rides up with it
@include breakpoints.beside-the-map {
  .map-bottom-stack {
    grid-template-columns: minmax(0, min(65vw, 600px)) 1fr;
    grid-template-areas:
      'inlineStart inlineEnd'
      'footer      inlineEnd';
  }
}

.map-bottom-start > .mapboxgl-ctrl,
.map-bottom-end > .mapboxgl-ctrl,
.map-footer > * {
  margin-block-end: $widget-gap;
}

.map-bottom-start > .mapboxgl-ctrl {
  margin-inline-start: $widget-gap;
}

.map-bottom-end > .mapboxgl-ctrl {
  margin-inline-end: $widget-gap;
}

.map-footer > * {
  margin-inline: $widget-gap;

  // Hidden rather than absent, so the row has something to animate and asShown something to measure
  opacity: 0;
  visibility: hidden;
  // Nothing to wait for on the way out
  --fade-delay: 0s;

  transition:
    opacity var(--fade-speed) var(--transition-ease) var(--fade-delay),
    visibility var(--transition-speed) var(--transition-ease);
}

.map-container.card-shown .map-footer > * {
  opacity: 1;
  visibility: visible;
  // Wait for the room to be made, and finish as it finishes
  --fade-delay: calc(var(--transition-speed) - var(--fade-speed));
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

.mapboxgl-ctrl-attrib a[href] {
  color: inherit;
}

.mapboxgl-ctrl-attrib-button {
  background: var(--color-full);
  mask: url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg' fill-rule='evenodd'%3E%3Cpath d='M4 10a6 6 0 1 0 12 0 6 6 0 1 0-12 0m5-3a1 1 0 1 0 2 0 1 1 0 1 0-2 0m0 3a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0'/%3E%3C/svg%3E");
}

.mapboxgl-ctrl-scale {
  border-color: var(--color-strong);
  background-color: color-mix(in srgb, var(--background-full) 25%, transparent);
  color: var(--color-strong);
}
</style>
