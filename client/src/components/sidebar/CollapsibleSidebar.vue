<script setup lang="ts">
import { ref } from 'vue';

import { provideStickyHeader } from '@/services/useStickyHeader';

import UIIcon from '../ui/UIIcon.vue';

const minimised = defineModel<boolean>('minimised');

const rtl = document.dir === 'rtl';

// Each points the way the sidebar is about to travel
const hideChevron = rtl ? 'chevron_right' : 'chevron_left';
const showChevron = rtl ? 'chevron_left' : 'chevron_right';

const appName = import.meta.env.VITE_APP_NAME as string;

const emit = defineEmits<{
  scrollDown: [];
}>();

const { heightPx: stickyHeaderHeightPx } = provideStickyHeader();

const scrollable = ref<HTMLElement>();

const SCROLL_ALLOWANCE_PX = 10;

function clickHeader() {
  if (!scrollable.value) {
    return;
  } else if (scrollable.value.scrollTop <= SCROLL_ALLOWANCE_PX) {
    emit('scrollDown');
  } else {
    scrollable.value.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
</script>

<template>
  <div :class="[$style.sidebar, minimised && $style.minimised]">
    <div :class="$style.topBox">
      <div :class="$style.header">
        <svg viewBox="0 0 110 36" @click="clickHeader()">
          <text x="55" y="13" text-anchor="middle" font-weight="bold">
            {{ appName }}
          </text>
          <image x="10" y="20" width="90" href="@/assets/powered-by-strava.svg" />
        </svg>
      </div>
    </div>
    <button type="button" :class="$style.handle" @click="minimised = !minimised">
      <span :class="[$style.handleCurve, $style.top]" />
      <span :class="[$style.face, $style.map]" :aria-hidden="minimised">
        <span>
          <UIIcon icon="map" :class="$style.viewIcon" aria-hidden="true" />
          <UIIcon :icon="hideChevron" :class="$style.foldIcon" aria-hidden="true" />
        </span>
        <span>Map</span>
      </span>
      <span :class="[$style.face, $style.back]" :aria-hidden="!minimised">
        <span>
          <UIIcon icon="menu" :class="$style.viewIcon" aria-hidden="true" />
          <UIIcon :icon="showChevron" :class="$style.foldIcon" aria-hidden="true" />
        </span>
        <span>Menu</span>
      </span>
      <span :class="[$style.handleCurve, $style.bottom]" />
    </button>

    <section ref="scrollable" :class="$style.scrollable">
      <slot />
    </section>

    <div @click="minimised = !minimised" @wheel="minimised = true">
      <div :class="[$style.expanded, $style.overlay]" />
      <div :class="[$style.minimised, $style.overlay]" />
    </div>
  </div>
</template>

<style module lang="scss">
@use '@/styles/breakpoints';
@use '@/styles/sidebar';

$sidebar-width: min(20rem, 100vw - #{sidebar.$handle-width});
$scaled-corner-radius: min(var(--handle-radius), 50%);
$pseudo-scaled-corner-radius: min(var(--handle-radius), 100%);

$sidebar-overlap: calc(-1 * #{$sidebar-width});

@mixin pseudo-element {
  content: '';
  position: absolute;
  z-index: -1;
  background-color: var(--background-full);
}

.sidebar {
  --handle-radius: min(var(--surface-border-radius), calc(var(--handle-width) / 2));
  --bottom-curve: 1;

  flex: 0 $sidebar-width;
  // The logo is wider than the panel on a narrow screen, and its automatic minimum size would
  // hold the panel open past the width folding it away moves it by
  min-width: 0;
  display: flex;
  flex-direction: column;
  color: var(--color-full);
  background-color: var(--background-full);
  transition: margin var(--transition-speed) var(--transition-ease);
  z-index: 1;
  position: relative;
  padding-inline-start: var(--inline-start-safe-area);

  @include sidebar.metrics(':not(.minimised)');

  .header {
    margin-inline-start: auto;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: sidebar.$padding-top;
    background-color: var(--background-full);

    transition:
      margin var(--transition-speed) var(--transition-ease),
      width var(--transition-speed) var(--transition-ease);

    svg {
      height: sidebar.$logo-height;
      fill: var(--color-full);
      max-height: 100%;
    }
  }

  > .scrollable {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    transition: margin var(--transition-speed) var(--transition-ease);
    background-color: var(--background-full);
    padding-bottom: var(--bottom-safe-area);

    scroll-padding-block-start: v-bind('stickyHeaderHeightPx');
  }

  &.minimised {
    margin-inline-start: $sidebar-overlap;
    // Animate the margin and flex-basis together to prevent the sidebar moving
    transition:
      margin var(--transition-speed) var(--transition-ease),
      flex-basis var(--transition-speed) var(--transition-ease);

    // Offset the sidebar by the width of the safe area, so it is not visible on screen
    > .scrollable {
      margin-inline-start: calc(-1 * var(--inline-start-safe-area));
      margin-inline-end: var(--inline-start-safe-area);
    }

    .header {
      width: sidebar.$handle-width;
      margin-inline-end: -1 * sidebar.$handle-width;
    }

    .minimised.overlay {
      pointer-events: all;
    }
  }

  &:not(.minimised) {
    --top-curve: 1;

    // The handle's own width, as a percentage so that it tracks the handle as it resizes
    .face.back {
      margin-inline-end: 100%;
    }
  }
}

.overlay {
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  pointer-events: none;
  cursor: pointer;

  &.expanded {
    z-index: 2;
    inset-inline-start: 100%;
    width: 100vw;
    width: 100dvw;
  }

  &.minimised {
    inset-inline-start: 100%;
    inset-inline-end: calc(-1 * var(--sidebar-overlay-width));
    height: var(--sidebar-overlay-height);
  }
}

.handle {
  appearance: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: inherit;
  cursor: pointer;
  overflow: visible;

  position: relative;
  z-index: -2;
  height: sidebar.$handle-height;
  width: var(--handle-width);
  margin-inline-start: auto;
  margin-inline-end: calc(-1 * var(--handle-width));
  margin-bottom: -1 * sidebar.$handle-height;
  background: var(--background-full);
  border-end-end-radius: var(--handle-radius);
  border-start-end-radius: var(--handle-radius);
  transition:
    margin var(--transition-speed) var(--transition-ease),
    width var(--transition-speed) var(--transition-ease);

  // A child, because this button's own outline paints beneath the face that fills it
  &:focus-visible {
    outline: none;

    &::before {
      content: '';
      position: absolute;
      z-index: 1;
      inset: 0;
      box-sizing: border-box;
      border: 2px solid var(--bold-color);
      border-start-end-radius: var(--handle-radius);
      border-end-end-radius: var(--handle-radius);
      pointer-events: none;
    }
  }

  // Used for hiding the back button when the map button is shown
  &::after {
    @include pseudo-element;
    width: var(--handle-width);
    inset-inline-end: 100%;
    inset-block: 0;
    transition: width var(--transition-speed) var(--transition-ease);
  }
}

.face .foldIcon {
  display: none;
}

.handleCurve {
  display: block;
  width: 0;
  position: relative;
  margin-inline-start: auto;
  // Widths are percentages of the handle, tracking it as it resizes
  transition: width var(--transition-speed) var(--transition-ease);

  &::before {
    @include pseudo-element;
    inset-inline-start: 0;
    height: 2em;
    background-color: transparent;
    width: $scaled-corner-radius;
  }

  &.top {
    width: calc(100% * var(--top-curve, 0));

    &::before {
      bottom: 100%;
      box-shadow: 0 var(--handle-radius) 0 0 var(--background-full);
      border-end-start-radius: $pseudo-scaled-corner-radius;
      transition: inset var(--transition-speed) var(--transition-ease);
    }
  }

  &.bottom {
    margin-top: sidebar.$handle-height;
    width: calc(100% * var(--bottom-curve, 0));

    &::before {
      top: 100%;
      box-shadow: 0 calc(-1 * var(--handle-radius)) 0 0 var(--background-full);
      border-start-start-radius: $pseudo-scaled-corner-radius;
      transition: inset var(--transition-speed) var(--transition-ease);
    }
  }
}

.face {
  position: relative;
  height: 100%;
  background: var(--background-full);
  display: flex;
  margin-bottom: -1 * sidebar.$handle-height;
  flex-direction: column;
  align-items: end;
  justify-content: space-evenly;
  margin-inline-start: auto;
  text-align: center;
  border-start-end-radius: var(--handle-radius);
  border-end-end-radius: var(--handle-radius);
  transition:
    margin var(--transition-speed) var(--transition-ease),
    width var(--transition-speed) var(--transition-ease);

  > span {
    box-sizing: border-box;
    padding: 0 1em;
    width: var(--handle-width);
    // Clipped so that neither the icons nor the caption reach outside the handle as it grows
    overflow: clip;
    transition:
      padding var(--transition-speed) var(--transition-ease),
      width var(--transition-speed) var(--transition-ease);
  }

  // The rounded corners for the folding buttons
  &::before {
    @include pseudo-element;
    inset-inline-end: 0;
    height: calc(2 * var(--handle-radius));
    width: 0;
    transition:
      margin var(--transition-speed) var(--transition-ease),
      width var(--transition-speed) var(--transition-ease);
  }

  // Used for filling in the gap when a rounded corner is reduced to zero width in the animation
  &::after {
    @include pseudo-element;
    inset-inline-end: 0;
    width: var(--handle-radius);
    height: var(--handle-radius);
    transition: inset var(--transition-speed) var(--transition-ease);
  }

  // The top right corner
  &.map {
    &::before {
      top: 0;
      width: calc(100% * var(--top-curve, 0));
      border-start-end-radius: $scaled-corner-radius;
    }

    &::after {
      top: 0;
      inset-inline-end: calc(100% * var(--top-curve, 0));
    }
  }

  // The bottom right corner
  &.back {
    &::before {
      bottom: 0;
      width: calc(100% * var(--bottom-curve, 0));
      border-end-end-radius: $scaled-corner-radius;
    }

    &::after {
      bottom: 0;
      inset-inline-end: calc(100% * var(--bottom-curve, 0));
    }
  }
}

// On screens with space to fit the sidebar next to the map, a more subtle button is
// used to hide the sidebar
@include breakpoints.beside-the-map {
  .sidebar {
    .viewIcon {
      display: none;
    }

    .foldIcon {
      display: inline-block;
    }

    .face {
      > span {
        padding: 0;
      }

      // Clipped, not removed: the caption is the only thing naming the button
      > span:last-child {
        position: absolute;
        height: 1px;
        clip-path: inset(50%);
        white-space: nowrap;
      }
    }
  }
}

@include breakpoints.over-the-map {
  // Too narrow to give the sidebar room of its own, so it floats over the map instead
  .sidebar {
    margin-inline-end: $sidebar-overlap;

    &.minimised {
      margin-inline-end: 0;
    }

    &:not(.minimised) .expanded.overlay {
      pointer-events: all;
    }
  }
}
</style>
