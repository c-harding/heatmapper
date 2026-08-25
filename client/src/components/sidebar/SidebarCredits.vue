<script setup lang="ts">
import config from '@/utils/config';

const gitHash = config.GIT_HASH ?? null;
const gitBranch = config.GIT_BRANCH ?? null;
</script>

<template>
  <div :class="$style.sidebarCredits">
    <p>
      Made by
      <span :class="$style.keepTogether">Charlie Harding</span>
      <span :class="$style.keepTogether">
        <a
          :class="[$style.icon, $style.strava]"
          href="https://www.strava.com/athletes/13013632"
          target="_blank"
        >
          <img src="@/assets/strava.png" />
        </a>
        <a
          :class="[$style.icon, $style.github]"
          href="https://github.com/c-harding/heatmapper"
          target="_blank"
        >
          <img src="@/assets/github.png" />
        </a>
      </span>
    </p>
    <p v-if="gitHash">
      Build <code>{{ gitHash }}</code>
    </p>
    <p v-else-if="gitBranch">
      Branch <code>{{ gitBranch }}</code>
    </p>
  </div>
</template>

<style module lang="scss">
.sidebarCredits {
  font-size: 14px;
  padding: 1em 1em 0;
  text-align: center;
  margin-top: auto;

  display: flex;
  flex-direction: column;
  gap: 0.5em;

  > p {
    margin: 0;
  }

  .icon {
    // One box for both, since the two images are not the same size
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--tap-min);
    block-size: var(--tap-min);
    vertical-align: middle;

    // Holds the line to the image it used to be, rather than the box now around it
    margin-block: calc((1.5em - var(--tap-min)) / 2);

    // Clear of the name by the slack a bigger box leaves around the image inside it
    &:first-child {
      margin-inline-start: max(0px, calc(var(--tap-min) / 2 - 10px));
    }

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

    @media (prefers-color-scheme: dark) {
      &.github {
        filter: invert(1);
      }
    }
  }

  code {
    font-family:
      'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas, monospace;
  }
}

.keepTogether {
  display: inline-block;
}
</style>
