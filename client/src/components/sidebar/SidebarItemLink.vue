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
    :class="[$style.sidebarItemLink, useTextLink && $style.textLink]"
    @click.stop
  >
    <span :class="$style.mark">
      <template v-if="useTextLink">
        View on
        <br />
        Strava
      </template>
      <img v-else src="@/assets/strava.png" alt="" />
    </span>
  </a>
</template>

<style module lang="scss">
.sidebarItemLink {
  $size: 1.5em;
  align-self: stretch;
  width: $size;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;

  padding-inline-end: var(--row-inline-padding, 0px);
  margin-inline-end: calc(-1 * var(--row-inline-padding, 0px));
  padding-block: var(--row-block-padding, 0px);
  margin-block: calc(-1 * var(--row-block-padding, 0px));

  .mark {
    display: block;
    // On the mark rather than the link, as a rounded link would lose its corners from the target
    border-radius: var(--control-border-radius);

    > img {
      display: block;
      width: $size;
      height: $size;
    }
  }

  // In colour when focused too, as the greyscale would also grey its focus ring
  &:not(:hover, :focus-visible) {
    filter: grayscale(100%);
  }

  // Around the logo or text, as the link reaches into the row's padding to the sidebar's edge.
  // Only the style is moved: the colour stays the browser's, which on the mark would be its text's.
  &:focus-visible {
    outline-style: none;

    .mark {
      outline-style: auto;
      outline-color: inherit;
      outline-offset: 2px;
    }
  }

  &.textLink {
    text-align: center;
    width: auto;
    font-size: 0.6rem;
    color: var(--bold-color);
  }
}
</style>
