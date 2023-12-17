<script setup lang="ts">
import type { Activity, Route } from '@strava-heatmapper/shared/interfaces';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { MapStyle } from '../MapStyle';
import { findLastIndex } from '../utils/arrays';
import { cancelTextSelection } from '../utils/ui';
import ActivityItem from './ActivityItem.vue';
import FormComponent from './Form.vue';
import Icon from './Icon.vue';

function getRange(activities: Activity[], to: number, from?: number | number[]): number[] {
  if (to === undefined) return [];
  if (from === undefined) return [to];
  const fromArray: number[] = [from].flat();
  if (fromArray.includes(to)) return fromArray;

  const start = activities.findIndex(({ id }) => to === id || fromArray.includes(id));
  if (start === -1) return [to, ...fromArray];
  const end = findLastIndex(activities, ({ id }) => to === id || fromArray.includes(id));
  return activities.slice(start, end + 1).map(({ id }) => id);
}

const props = withDefaults(
  defineProps<{
    activities: Activity[];
    selected?: number[];
    terrain?: boolean;
    mapStyle?: MapStyle;
  }>(),
  {
    activities: () => [],
    selected: () => [],
    terrain: false,
    mapStyle: MapStyle.STRAVA,
  },
);

const emit = defineEmits<{
  (e: 'zoom-to-selected'): void;
  (e: 'add-activities', value: Activity[] | Route[]): void;
  (e: 'add-activity-maps', value: Record<string, string>): void;
  (e: 'clear-activities'): void;
  (e: 'update:selected', value: number[]): void;
  (e: 'zoom-to-selected', value: number[]): void;
  (e: 'update:mapStyle', value: MapStyle): void;
  (e: 'update:terrain', value: boolean): void;
}>();

const mapStyleModel = computed<MapStyle>({
  get() {
    return props.mapStyle;
  },
  set(value) {
    emit('update:mapStyle', value);
  },
});

const terrainModel = computed<boolean>({
  get() {
    return props.terrain;
  },
  set(value) {
    emit('update:terrain', value);
  },
});

const form = ref<InstanceType<typeof FormComponent>>();

const localSelected = ref<number[]>();

const selectionBase = ref<number[]>();

const minimised = ref(false);

const gitHash = process.env.VUE_APP_GIT_HASH ?? null;

const nbsp = '\xa0';

const activityItemList = ref<HTMLUListElement>();

function toggleInArray<T>(array: T[], item: T): T[] {
  if (array.includes(item)) return array.filter((x) => x !== item);
  else return [...array, item];
}

function getSelection(id: number, e: MouseEvent): number[] {
  if (e.metaKey || e.ctrlKey) return toggleInArray(props.selected, id);
  if (e.shiftKey) return getRange(props.activities, id, selectionBase.value);
  return [id];
}

function click(id: number, e: MouseEvent): void {
  if (e.detail === 1) select(id, e);
}

function select(id: number, e: MouseEvent): void {
  if (e.shiftKey) cancelTextSelection();
  const newSelected = getSelection(id, e);
  if (newSelected.length === 1) selectionBase.value = newSelected;
  localSelected.value = newSelected;
  emit('update:selected', newSelected);
}

function forceSelect(): void {
  cancelTextSelection();
  emit('zoom-to-selected', props.selected);
}

watch(
  () => props.selected,
  async (selected: number[]) => {
    if (selected !== localSelected.value) {
      localSelected.value = selected;
      selectionBase.value = selected;
      if (selected.length !== 0) minimised.value = false;
      await nextTick();
      const el = activityItemList.value?.querySelector('.selected');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  },
);

onMounted(() => {
  if (!props.activities || props.activities.length === 0) {
    form.value?.loadFromCache();
  }
});
</script>

<template>
  <div class="sidebar" :class="{ minimised }">
    <div class="top-box">
      <div class="header">
        <svg viewBox="0 0 110 36">
          <text x="55" text-anchor="middle" font-weight="bold">
            <tspan x="55" y="13">Strava</tspan>
            <tspan x="55" dy="18">Heatmapper</tspan>
          </text>
        </svg>
      </div>
    </div>
    <div class="minimised-message map">
      <p><Icon>map</Icon></p>
      <p>Map</p>
    </div>
    <div class="minimised-message">
      <p><Icon>arrow_back</Icon></p>
      <p>Back</p>
    </div>
    <div class="scrollable">
      <FormComponent
        ref="form"
        v-model:terrain="terrainModel"
        v-model:map-style="mapStyleModel"
        @clear-activities="emit('clear-activities')"
        @add-activities="emit('add-activities', $event)"
        @add-activity-maps="emit('add-activity-maps', $event)"
      />
      <ul ref="activityItemList">
        <ActivityItem
          v-for="activity of activities"
          :key="activity.id"
          :activity="activity"
          :selected="selected.includes(activity.id)"
          @click="click(activity.id, $event)"
          @dblclick="forceSelect"
        />
      </ul>
      <p class="credits">
        Made by Charlie{{ nbsp }}Harding
        <a class="icon strava" href="https://www.strava.com/athletes/13013632"
          ><img src="@/assets/strava.png"
        /></a>
        <a class="icon github" href="https://github.com/c-harding/heatmapper"
          ><img src="@/assets/github.png"
        /></a>
        <br />
        <span v-if="gitHash" class="credits">
          Build <code>{{ gitHash }}</code>
        </span>
      </p>
    </div>

    <div class="overlay" @click="minimised = !minimised" @wheel="minimised = true" />
  </div>
</template>

<style lang="scss">
$max-sidebar-width: calc(100vw - 6rem);
$sidebar-width: 20rem;
$minimised-width: 5rem;
$max-size-to-minimise: 600px;

.sidebar {
  flex: 0 $sidebar-width;
  max-width: $max-sidebar-width;
  display: flex;
  flex-direction: column;
  color: var(--color);
  background-color: var(--background);
  transition: margin var(--transition-speed);
  z-index: 1;
  position: relative;

  .header {
    margin-left: auto;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5em 0 0;

    transition: margin var(--transition-speed), width var(--transition-speed);

    svg {
      height: $minimised-width;
      fill: var(--color);
      max-height: 100%;
    }
  }

  > .scrollable {
    flex: 1;
    overflow: auto;
    padding: 0 0 1em;
    background-color: var(--background);
    transition: margin var(--transition-speed);
    display: flex;
    flex-direction: column;

    > ul {
      padding: 0;
      margin: 0;
    }

    .credits {
      font-size: 14px;
      padding: 1em;
      text-align: center;
      margin: 0;
      margin-top: auto;

      .icon {
        img {
          height: 1.5em;
          vertical-align: middle;
        }

        &.github {
          font-size: 0.8em;
        }

        &.strava:not(:hover) {
          filter: grayscale(1);
        }

        &.github:not(:hover) {
          opacity: 0.6;
        }
      }

      code {
        font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas,
          monospace;
      }
    }
  }

  .top-box {
    transition: margin var(--transition-speed);
  }
}

.overlay {
  display: none;
  cursor: pointer;
}

.minimised-message {
  height: 5rem;
  background: var(--background);
  width: $minimised-width;
  display: flex;
  margin-bottom: -5rem;
  flex-direction: column;
  justify-content: space-evenly;
  margin-left: auto;
  text-align: center;
  transition: margin var(--transition-speed);

  p {
    margin: 0 1em;
  }

  &.map {
    border-radius: 0 1em 1em 0;
    position: relative;
    z-index: -1;

    &::before,
    &::after {
      position: absolute;
      content: '';
      height: 2em;
      left: 0;
      width: 1em;
      background-color: transparent;
    }
    &::before {
      bottom: 100%;
      box-shadow: 0 1em 0 0 var(--background);
      border-bottom-left-radius: 1em;
    }
    &::after {
      top: 100%;
      box-shadow: 0 -1em 0 0 var(--background);
      border-top-left-radius: 1em;
    }
  }
}

@media screen and (max-width: $max-size-to-minimise) {
  .overlay {
    display: block;
    position: absolute;
    z-index: 2;
    left: 100%;
    top: 0;
    bottom: 0;
    width: 100vw;
  }

  .sidebar {
    $sidebar-overlap-fallback: $minimised-width - $sidebar-width;
    $sidebar-overlap: calc(#{$minimised-width} - min(#{$sidebar-width}, #{$max-sidebar-width}));
    margin-right: $sidebar-overlap-fallback;
    margin-right: $sidebar-overlap;

    &.minimised {
      margin-left: $sidebar-overlap-fallback;
      margin-left: $sidebar-overlap;
      margin-right: 0;

      > .scrollable {
        margin-left: -$minimised-width;
        margin-right: $minimised-width;
      }

      .top-box {
        margin-left: -$minimised-width;
        margin-right: $minimised-width;
      }

      .overlay {
        right: 0;
        left: unset;
      }

      .header {
        width: $minimised-width;
        margin-right: -$minimised-width;
      }
    }

    &:not(.minimised) .minimised-message.map {
      margin-right: -$minimised-width;
    }
  }
}
</style>
