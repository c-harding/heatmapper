<script setup lang="ts">
import config from '@/utils/config';

const gitHash = config.GIT_HASH ?? null;
</script>

<template>
  <div class="sidebar-credits">
    <p>
      Made by
      <span class="keep-together">Charlie Harding</span>
      <span class="keep-together">
        <a class="icon strava" href="https://www.strava.com/athletes/13013632" target="_blank">
          <img src="@/assets/strava.png" />
        </a>
        <a class="icon github" href="https://github.com/c-harding/heatmapper" target="_blank">
          <img src="@/assets/github.png" />
        </a>
      </span>
    </p>
    <p v-if="gitHash">
      Build <code>{{ gitHash }}</code>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.sidebar-credits {
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

    @media (prefers-color-scheme: dark) {
      &.github {
        filter: invert(1);
      }
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
</style>
