<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { nextTick, ref, watch } from 'vue';

import { useActivityService } from '@/services/useActivityService';
import config from '@/utils/config';
import { cancelTextSelection } from '@/utils/ui';

import SidebarForm from './SidebarForm.vue';
import SidebarItem from './SidebarItem.vue';

function getRange(mapItems: readonly MapItem[], to: string, from?: string | string[]): string[] {
  if (to === undefined) return [];
  if (from === undefined) return [to];
  const fromArray: string[] = [from].flat();
  if (fromArray.includes(to)) return fromArray;

  const start = mapItems.findIndex(({ id }) => to === id || fromArray.includes(id));
  if (start === -1) return [to, ...fromArray];
  const end = mapItems.findLastIndex(({ id }) => to === id || fromArray.includes(id));
  return mapItems.slice(start, end + 1).map(({ id }) => id);
}

const selected = defineModel<string[]>('selected', { required: true });

const emit = defineEmits<{
  'zoom-to-selected': [];
  'focus-sidebar': [];
}>();

const { mapItems } = useActivityService();

const localSelected = ref<string[]>();

const selectionBase = ref<string[]>();

const gitHash = config.GIT_HASH ?? null;

const sidebarItemList = ref<HTMLUListElement>();

function toggleInArray<T>(array: T[], item: T): T[] {
  if (array.includes(item)) return array.filter((x) => x !== item);
  else return [...array, item];
}

function getSelection(id: string, e: MouseEvent): string[] {
  if (e.metaKey || e.ctrlKey) return toggleInArray(selected.value, id);
  if (e.shiftKey) return getRange(mapItems.value, id, selectionBase.value);
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
  selected.value = newSelected;
}

function forceSelect(): void {
  cancelTextSelection();
  emit('zoom-to-selected');
}

watch(selected, async (selected: string[]) => {
  if (selected !== localSelected.value) {
    localSelected.value = selected;
    selectionBase.value = selected;
    if (selected.length !== 0) emit('focus-sidebar');
    await nextTick();
    const el = sidebarItemList.value?.querySelector('.selected');
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
});
</script>

<template>
  <div class="sidebar-content">
    <SidebarForm />
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
