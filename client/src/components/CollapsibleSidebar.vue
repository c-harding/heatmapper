<script setup lang="ts">
import { ref } from 'vue';

import { useModel } from '../utils/useModel';
import Icon from './Icon.vue';

const props = withDefaults(
  defineProps<{
    minimised: boolean;
  }>(),
  {},
);

const emit = defineEmits<{
  (e: 'update:minimised', value: boolean): void;
}>();

const minimisedModel = useModel('minimised', props)(emit);

const minimisedOverlay = ref<HTMLElement>();
</script>

<template>
  <div class="sidebar" :class="{ minimised: minimisedModel }">
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
    <div class="tabs">
      <div class="tab-curve top" />
      <div class="tab map">
        <p><Icon>map</Icon></p>
        <p>Map</p>
      </div>
      <div class="tab back">
        <p><Icon>arrow_back</Icon></p>
        <p>Back</p>
      </div>
      <div class="tab-curve bottom" />
    </div>

    <section class="scrollable">
      <slot />
    </section>

    <div class="overlays" @click="minimisedModel = !minimisedModel" @wheel="minimisedModel = true">
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
  padding-left: var(--left-safe-area);

  .header {
    margin-left: auto;
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
  margin-left: auto;
  margin-bottom: -$tab-height;
  background: var(--background);
  border-bottom-right-radius: $corner-radius;
  border-top-right-radius: $corner-radius;
  transition:
    margin var(--transition-speed),
    width var(--transition-speed);

  // Used for hiding the back button when the map button is shown
  &::after {
    @include pseudo-element;
    width: $tab-width;
    right: 100%;
    top: 0;
    bottom: 0;
  }
}

.tab-curve {
  width: 0;
  position: relative;
  margin-left: auto;
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
  left: 0;
  height: 2em;
  background-color: transparent;
  width: $scaled-corner-radius;
}

.tab-curve.top::before {
  bottom: 100%;
  box-shadow: 0 $corner-radius 0 0 var(--background);
  border-bottom-left-radius: $pseudo-scaled-corner-radius;
  transition: left var(--transition-speed);
}

.tab-curve.bottom::before {
  top: 100%;
  box-shadow: 0 (-$corner-radius) 0 0 var(--background);
  border-top-left-radius: $pseudo-scaled-corner-radius;
  transition: left var(--transition-speed);
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
  margin-left: auto;
  text-align: center;
  border-top-right-radius: $corner-radius;
  border-bottom-right-radius: $corner-radius;
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
    right: 0;
    height: 2 * $corner-radius;
    width: 0;
    transition:
      margin var(--transition-speed),
      width var(--transition-speed);
  }

  // Used for filling in the gap when a rounded corner is reduced to zero width in the animation
  &::after {
    @include pseudo-element;
    right: 0;
    width: $corner-radius;
    height: $corner-radius;
    transition: right var(--transition-speed);
  }

  // The top right corner
  &.map {
    &::before {
      top: 0;
      width: calc($tab-width * var(--top-curve, 0));
      border-top-right-radius: $scaled-corner-radius;
    }

    &::after {
      top: 0;
      right: calc($tab-width * var(--top-curve, 0));
    }
  }

  // The bottom right corner
  &.back {
    &::before {
      bottom: 0;
      width: calc($tab-width * var(--bottom-curve, 0));
      border-bottom-right-radius: $scaled-corner-radius;
    }

    &::after {
      bottom: 0;
      right: calc($tab-width * var(--bottom-curve, 0));
    }
  }
}

@media screen and (max-width: $max-size-to-minimise) {
  .sidebar {
    $sidebar-overlap: calc(#{$minimised-width} - #{$sidebar-width});
    $sidebar-overlay-width: $minimised-width + $tab-width;
    $sidebar-overlay-height: calc(#{$padding-top} + #{$logo-height} + #{$tab-height});

    margin-right: $sidebar-overlap;

    .overlay {
      display: block;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;

      &.expanded {
        position: absolute;
        z-index: 2;
        left: 100%;
        width: 100vw;
        width: 100dvw;
      }

      &.minimised {
        left: 100%;
        right: -$sidebar-overlay-width;
        height: $sidebar-overlay-height;
      }
    }

    &.minimised {
      margin-left: $sidebar-overlap;
      margin-right: 0;

      > .top-box,
      > .scrollable {
        margin-left: -$minimised-width;
        margin-right: $minimised-width;
      }

      .header {
        width: $minimised-width + $tab-width;
        margin-right: -$minimised-width - $tab-width;
      }

      .minimised.overlay {
        pointer-events: all;
      }

      + * {
        --sidebar-overlay-width: #{$sidebar-overlay-width};
        --sidebar-overlay-height: #{$sidebar-overlay-height};
      }
    }

    .tabs {
      margin-right: -$tab-width;
    }

    &:not(.minimised) {
      .tab.back {
        margin-right: $tab-width;
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
