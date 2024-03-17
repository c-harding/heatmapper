<script setup lang="ts">
import { ref } from 'vue';

import UIIcon from './ui/UIIcon.vue';

const minimised = defineModel<boolean>();

const minimisedOverlay = ref<HTMLElement>();

const backArrow = document.dir === 'rtl' ? 'arrow_forward' : 'arrow_back';

const appName = import.meta.env.VITE_APP_NAME as string;
</script>

<template>
  <div class="sidebar" :class="{ minimised }">
    <div class="top-box">
      <div class="header">
        <svg viewBox="0 0 110 36">
          <text x="55" y="13" text-anchor="middle" font-weight="bold">
            {{ appName }}
          </text>
          <image x="10" y="20" width="90" href="@/assets/powered-by-strava.svg" />
        </svg>
      </div>
    </div>
    <div class="tabs">
      <div class="tab-curve top" />
      <div class="tab map">
        <p>
          <UIIcon>map</UIIcon>
        </p>
        <p>Map</p>
      </div>
      <div class="tab back">
        <p>
          <UIIcon>{{ backArrow }}</UIIcon>
        </p>
        <p>Back</p>
      </div>
      <div class="tab-curve bottom" />
    </div>

    <section class="scrollable">
      <slot />
    </section>

    <div class="overlays" @click="minimised = !minimised" @wheel="minimised = true">
      <div class="expanded overlay" />
      <div ref="minimisedOverlay" class="minimised overlay" />
    </div>
  </div>
</template>

<style lang="scss">
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
  background-color: var(--background);
}

.sidebar {
  flex: 0 $sidebar-width;
  display: flex;
  flex-direction: column;
  color: var(--color);
  background-color: var(--background);
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
    background-color: var(--background);

    transition:
      margin var(--transition-speed),
      width var(--transition-speed);

    svg {
      height: $logo-height;
      fill: var(--color);
      max-height: 100%;
    }
  }

  > .scrollable {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    transition: margin var(--transition-speed);
    background-color: var(--background);
    padding-bottom: var(--bottom-safe-area);
  }

  .top-box {
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
  background: var(--background);
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

.tab-curve {
  width: 0;
  position: relative;
  margin-inline-start: auto;
  transition: width var(--transition-speed);
}

.tab-curve.top {
  width: calc($tab-width * var(--top-curve, 0));
}

.tab-curve.bottom {
  margin-top: $tab-height;
  width: calc($tab-width * var(--bottom-curve, 0));
}

.tab-curve::before {
  @include pseudo-element;
  inset-inline-start: 0;
  height: 2em;
  background-color: transparent;
  width: $scaled-corner-radius;
}

.tab-curve.top::before {
  bottom: 100%;
  box-shadow: 0 $corner-radius 0 0 var(--background);
  border-end-start-radius: $pseudo-scaled-corner-radius;
  transition: inset var(--transition-speed);
}

.tab-curve.bottom::before {
  top: 100%;
  box-shadow: 0 (-$corner-radius) 0 0 var(--background);
  border-start-start-radius: $pseudo-scaled-corner-radius;
  transition: inset var(--transition-speed);
}

.tab {
  position: relative;
  height: 100%;
  background: var(--background);
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

      > .top-box,
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
