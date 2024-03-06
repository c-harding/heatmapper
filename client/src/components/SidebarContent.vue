<script lang="ts">
// Set in vite.config.js
declare const GIT_HASH: string | undefined;
</script>

<script setup lang="ts">
import type { MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import type { MapStyle } from '../MapStyle';
import { findLastIndex } from '../utils/arrays';
import { cancelTextSelection } from '../utils/ui';
import FormComponent from './Form.vue';
import SidebarItem from './SidebarItem.vue';

function getRange(mapItems: MapItem[], to: string, from?: string | string[]): string[] {
  if (to === undefined) return [];
  if (from === undefined) return [to];
  const fromArray: string[] = [from].flat();
  if (fromArray.includes(to)) return fromArray;

  const start = mapItems.findIndex(({ id }) => to === id || fromArray.includes(id));
  if (start === -1) return [to, ...fromArray];
  const end = findLastIndex(mapItems, ({ id }) => to === id || fromArray.includes(id));
  return mapItems.slice(start, end + 1).map(({ id }) => id);
}

const props = withDefaults(
  defineProps<{
    mapItems: MapItem[];
    selected?: string[];
    mapStyle: MapStyle;
  }>(),
  {
    mapItems: () => [],
    selected: () => [],
  },
);

const emit = defineEmits<{
  (e: 'add-map-items', value: MapItem[]): void;
  (e: 'add-maps', value: Record<string, string>): void;
  (e: 'clear-map-items'): void;
  (e: 'update:selected', value: string[]): void;
  (e: 'zoom-to-selected'): void;
  (e: 'update:mapStyle', value: MapStyle): void;
  (e: 'focus-sidebar'): void;
}>();

// TODO: extract
const mapStyleModel = computed<MapStyle>({
  get() {
    return props.mapStyle;
  },
  set(value) {
    emit('update:mapStyle', value);
  },
});

const form = ref<InstanceType<typeof FormComponent>>();

const localSelected = ref<string[]>();

const selectionBase = ref<string[]>();

const gitHash = GIT_HASH ?? null;

const sidebarItemList = ref<HTMLUListElement>();

function toggleInArray<T>(array: T[], item: T): T[] {
  if (array.includes(item)) return array.filter((x) => x !== item);
  else return [...array, item];
}

function getSelection(id: string, e: MouseEvent): string[] {
  if (e.metaKey || e.ctrlKey) return toggleInArray(props.selected, id);
  if (e.shiftKey) return getRange(props.mapItems, id, selectionBase.value);
  return [id];
}

function click(id: string, e: MouseEvent): void {
  if (e.detail === 1) select(id, e);
}

function select(id: string, e: MouseEvent): void {
  if (e.shiftKey) cancelTextSelection();
  const newSelected = getSelection(id, e);
  if (newSelected.length === 1) selectionBase.value = newSelected;
  localSelected.value = newSelected;
  emit('update:selected', newSelected);
}

function forceSelect(): void {
  cancelTextSelection();
  emit('zoom-to-selected');
}

watch(
  () => props.selected,
  async (selected: string[]) => {
    if (selected !== localSelected.value) {
      localSelected.value = selected;
      selectionBase.value = selected;
      if (selected.length !== 0) emit('focus-sidebar');
      await nextTick();
      const el = sidebarItemList.value?.querySelector('.selected');
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  },
);

onMounted(() => {
  if (!props.mapItems || props.mapItems.length === 0) {
    form.value?.loadFromCache();
  }
});
</script>

<template>
  <div class="sidebar-content">
    <FormComponent
      ref="form"
      v-model:map-style="mapStyleModel"
      @clear-map-items="emit('clear-map-items')"
      @add-map-items="emit('add-map-items', $event)"
      @add-maps="emit('add-maps', $event)"
    />
    <ul ref="sidebarItemList">
      <SidebarItem
        v-for="item of mapItems"
        :key="item.id"
        :item="item"
        :selected="selected.includes(item.id)"
        @click="click(item.id, $event)"
        @dblclick="forceSelect"
      />
    </ul>
    <div class="credits">
      <p>
        Made by
        <span class="keep-together">Charlie Harding</span>
        <span class="keep-together">
          <a class="icon strava" href="https://www.strava.com/athletes/13013632"
            ><img src="@/assets/strava.png"
          /></a>
          <a class="icon github" href="https://github.com/c-harding/heatmapper"
            ><img src="@/assets/github.png"
          /></a>
        </span>
      </p>
      <p v-if="gitHash">
        Build <code>{{ gitHash }}</code>
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebar-content {
  flex: 1;
  padding: 0 0 1em;
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
    margin-top: auto;

    p {
      margin: 0;
    }

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

  .keep-together {
    display: inline-block;
  }
}
</style>
