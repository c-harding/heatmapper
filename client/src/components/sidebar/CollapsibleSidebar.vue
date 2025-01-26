<script setup lang="ts">
import { ref } from 'vue';

import UIIcon from '../ui/UIIcon.vue';

const minimised = defineModel<boolean>();

const minimisedOverlay = ref<HTMLElement>();

const backArrow = document.dir === 'rtl' ? 'arrow_forward' : 'arrow_back';

const appName = import.meta.env.VITE_APP_NAME as string;

const emit = defineEmits<{
  scrollDown: [];
}>();

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
    <div :class="$style.tabs">
      <div :class="[$style.tabCurve, $style.top]" />
      <div :class="[$style.tab, $style.map]">
        <p>
          <UIIcon icon="map" />
        </p>
        <p>Map</p>
      </div>
      <div :class="[$style.tab, $style.back]">
        <p>
          <UIIcon :icon="backArrow" />
        </p>
        <p>Back</p>
      </div>
      <div :class="[$style.tabCurve, $style.bottom]" />
    </div>

    <section ref="scrollable" :class="$style.scrollable">
      <slot />
    </section>

    <div :class="$style.overlays" @click="minimised = !minimised" @wheel="minimised = true">
      <div :class="[$style.expanded, $style.overlay]" />
      <div ref="minimisedOverlay" :class="[$style.minimised, $style.overlay]" />
    </div>
  </div>
</template>

<style module lang="scss">
$tab-width: 5rem;
$tab-height: 5rem;
$logo-height: 5rem;

$minimised-width: 0rem;
$sidebar-width: min(20rem, 100vw - #{$tab-width});
$corner-radius: 1rem;
$scaled-corner-radius: min($corner-radius, 50%);
$pseudo-scaled-corner-radius: min($corner-radius, 100%);

$max-size-to-minimise: 600px;
$padding-top: calc(0.5rem + var(--top-safe-area));

@mixin pseudo-element {
  content: '';
  position: absolute;
  z-index: -1;
  background-color: var(--background-full);
}

.sidebar {
  flex: 0 $sidebar-width;
  display: flex;
  flex-direction: column;
  color: var(--color-full);
  background-color: var(--background-full);
  transition: margin var(--transition-speed);
  z-index: 1;
  position: relative;
  padding-inline-start: var(--inline-start-safe-area);

  .header {
    margin-inline-start: auto;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: $padding-top;
    background-color: var(--background-full);

    transition:
      margin var(--transition-speed),
      width var(--transition-speed);

    svg {
      height: $logo-height;
      fill: var(--color-full);
      max-height: 100%;
    }
  }

  > .scrollable {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    transition: margin var(--transition-speed);
    background-color: var(--background-full);
    padding-bottom: var(--bottom-safe-area);
  }

  .topBox {
    transition: margin var(--transition-speed);
  }
}

.overlay {
  display: none;
  pointer-events: none;
  cursor: pointer;
}

.tabs {
  position: relative;
  z-index: -2;
  height: $tab-height;
  width: $tab-width;
  margin-inline-start: auto;
  margin-bottom: -$tab-height;
  background: var(--background-full);
  border-end-end-radius: $corner-radius;
  border-start-end-radius: $corner-radius;
  transition:
    margin var(--transition-speed),
    width var(--transition-speed);

  // Used for hiding the back button when the map button is shown
  &::after {
    @include pseudo-element;
    width: $tab-width;
    inset-inline-end: 100%;
    inset-block: 0;
  }
}

.tabCurve {
  width: 0;
  position: relative;
  margin-inline-start: auto;
  transition: width var(--transition-speed);

  &::before {
    @include pseudo-element;
    inset-inline-start: 0;
    height: 2em;
    background-color: transparent;
    width: $scaled-corner-radius;
  }

  &.top {
    width: calc($tab-width * var(--top-curve, 0));

    &::before {
      bottom: 100%;
      box-shadow: 0 $corner-radius 0 0 var(--background-full);
      border-end-start-radius: $pseudo-scaled-corner-radius;
      transition: inset var(--transition-speed);
    }
  }

  &.bottom {
    margin-top: $tab-height;
    width: calc($tab-width * var(--bottom-curve, 0));

    &::before {
      top: 100%;
      box-shadow: 0 (-$corner-radius) 0 0 var(--background-full);
      border-start-start-radius: $pseudo-scaled-corner-radius;
      transition: inset var(--transition-speed);
    }
  }
}

.tab {
  position: relative;
  height: 100%;
  background: var(--background-full);
  display: flex;
  margin-bottom: -5rem;
  flex-direction: column;
  align-items: end;
  justify-content: space-evenly;
  margin-inline-start: auto;
  text-align: center;
  border-start-end-radius: $corner-radius;
  border-end-end-radius: $corner-radius;
  transition:
    margin var(--transition-speed),
    width var(--transition-speed);

  p {
    margin: 0;
    box-sizing: border-box;
    padding: 0 1em;
    width: $tab-width;
  }

  // The rounded corners for the folding buttons
  &::before {
    @include pseudo-element;
    inset-inline-end: 0;
    height: 2 * $corner-radius;
    width: 0;
    transition:
      margin var(--transition-speed),
      width var(--transition-speed);
  }

  // Used for filling in the gap when a rounded corner is reduced to zero width in the animation
  &::after {
    @include pseudo-element;
    inset-inline-end: 0;
    width: $corner-radius;
    height: $corner-radius;
    transition: inset var(--transition-speed);
  }

  // The top right corner
  &.map {
    &::before {
      top: 0;
      width: calc($tab-width * var(--top-curve, 0));
      border-start-end-radius: $scaled-corner-radius;
    }

    &::after {
      top: 0;
      inset-inline-end: calc($tab-width * var(--top-curve, 0));
    }
  }

  // The bottom right corner
  &.back {
    &::before {
      bottom: 0;
      width: calc($tab-width * var(--bottom-curve, 0));
      border-end-end-radius: $scaled-corner-radius;
    }

    &::after {
      bottom: 0;
      inset-inline-end: calc($tab-width * var(--bottom-curve, 0));
    }
  }
}

@media screen and (max-width: $max-size-to-minimise) {
  $sidebar-overlap: calc(#{$minimised-width} - #{$sidebar-width});
  $sidebar-overlay-width: $minimised-width + $tab-width;
  $sidebar-overlay-height: calc(#{$padding-top} + #{$logo-height} + #{$tab-height});

  #app {
    --sidebar-overlay-width: #{$sidebar-overlay-width};
    --sidebar-overlay-height: #{$sidebar-overlay-height};
  }

  .sidebar {
    margin-inline-end: $sidebar-overlap;

    .overlay {
      display: block;
      position: absolute;
      inset-block: 0;
      inset-inline-end: 0;

      &.expanded {
        position: absolute;
        z-index: 2;
        inset-inline-start: 100%;
        width: 100vw;
        width: 100dvw;
      }

      &.minimised {
        inset-inline-start: 100%;
        inset-inline-end: -$sidebar-overlay-width;
        height: $sidebar-overlay-height;
      }
    }

    &.minimised {
      margin-inline-start: $sidebar-overlap;
      margin-inline-end: 0;

      > .topBox,
      > .scrollable {
        margin-inline-start: -$minimised-width;
        margin-inline-end: $minimised-width;
      }

      .header {
        width: $minimised-width + $tab-width;
        margin-inline-end: -$minimised-width - $tab-width;
      }

      .minimised.overlay {
        pointer-events: all;
      }
    }

    .tabs {
      margin-inline-end: -$tab-width;
    }

    &:not(.minimised) {
      .tab.back {
        margin-inline-end: $tab-width;
      }

      --top-curve: 1;

      .expanded.overlay {
        pointer-events: all;
      }
    }

    --bottom-curve: 1;
  }
}
</style>
