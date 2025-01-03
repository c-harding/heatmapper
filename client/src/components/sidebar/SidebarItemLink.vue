<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import config from '@/utils/config';

const { item } = defineProps<{
  item: MapItem;
}>();

const url = computed<string>(() => {
  if (item.route) {
    return `https://www.strava.com/routes/${item.id}`;
  } else {
    return `https://www.strava.com/activities/${item.id}`;
  }
});

const useTextLink = !config.USE_STRAVA_ICONS;
</script>

<template>
  <a
    :href="url"
    target="_blank"
    title="View in Strava"
    class="sidebar-item-link"
    :class="{ 'text-link': useTextLink }"
    @click="$event.stopPropagation()"
  >
    <template v-if="useTextLink">
      <div>View on</div>
      <div>Strava</div>
    </template>
    <img v-else src="@/assets/strava.png" />
  </a>
</template>

<style lang="scss" scoped>
.sidebar-item-link {
  $size: 1.5em;
  align-self: stretch;
  width: $size;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  padding-right: 8px;

  > img {
    flex: 0 0 $size;
    height: $size;
  }

  &:not(:hover) {
    filter: grayscale(100%);
  }

  &.text-link {
    text-align: center;
    width: auto;
    font-size: 0.6rem;
    color: var(--bold-color);
  }
}
</style>
