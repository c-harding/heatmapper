<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { MapStyle } from '@/MapStyle';
import { useHasBeenTrue } from '@/utils/useHasBeenTrue';

import Icon from './Icon.vue';

interface Layer {
  style: MapStyle;
  label: string;
}

const clickedOpen = ref(false);

const mapStyle = defineModel<MapStyle>({ required: true });

const stravaStyleEnabled = useHasBeenTrue(() => mapStyle.value === MapStyle.STRAVA);

const stravaStyle: Layer = { style: MapStyle.STRAVA, label: 'Strava style' };
const mapboxStyles: Layer[] = [
  { style: MapStyle.STANDARD, label: 'Standard style' },
  { style: MapStyle.LIGHT, label: 'Light style' },
  { style: MapStyle.DARK, label: 'Dark style' },
  { style: MapStyle.OUTDOOR, label: 'Outdoor style' },
  { style: MapStyle.HYBRID, label: 'Hybrid' },
  { style: MapStyle.SATELLITE, label: 'Satellite' },
];

const styleOptions = computed<{ style: MapStyle; label: string }[]>(() => {
  return [...(stravaStyleEnabled ? [stravaStyle] : []), ...mapboxStyles];
});

const layerButton = ref<HTMLButtonElement>();
const layerPicker = ref<HTMLDivElement>();

const cancelClickOnClickOutside = false;

const onClickOutside = (e: MouseEvent) => {
  if (!clickedOpen.value) return;
  const elements = [layerButton.value, layerPicker.value];
  const target = e.target;
  if (target instanceof Node && elements.some((element) => element?.contains(target))) {
    // Click within
    return;
  } else {
    clickedOpen.value = false;
    e.stopPropagation();
  }
};

onMounted(() => {
  window.addEventListener('click', onClickOutside, { capture: cancelClickOnClickOutside });
});

onUnmounted(() => {
  window.removeEventListener('click', onClickOutside, { capture: cancelClickOnClickOutside });
});
</script>

<template>
  <button ref="layerButton" class="layer-button" @click="clickedOpen = !clickedOpen">
    <Icon>layers</Icon>
  </button>
  <div ref="layerPicker" class="layer-picker" :class="{ open: clickedOpen }">
    <menu>
      <li
        v-for="styleOption of styleOptions"
        :key="styleOption.style"
        :aria-selected="mapStyle === styleOption.style"
      >
        <a
          @click.prevent="
            mapStyle = styleOption.style;
            clickedOpen = false;
          "
        >
          {{ styleOption.label }}
        </a>
      </li>
    </menu>
  </div>
</template>

<style lang="scss">
.mapboxgl-ctrl:has(.layer-picker) {
  position: relative;
}

.layer-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.layer-picker {
  position: absolute;
  right: 100%;
  top: 0;
  width: max-content;

  .mapboxgl-ctrl:not(:hover) &:not(.open) {
    display: none;
  }

  menu {
    background: var(--background);
    border-radius: 0.5rem;
    overflow: hidden;
    list-style: none;
    margin: 0;
    margin-right: 0.5rem;
    padding: 0.5rem 0;

    li {
      &:hover {
        background-color: var(--background-slight);
      }

      &[aria-selected='true'] {
        background-color: var(--background-strong);
      }

      a {
        padding-inline: 1rem;
        display: block;
        cursor: pointer;
        color: inherit;
      }
    }
  }
}
</style>
