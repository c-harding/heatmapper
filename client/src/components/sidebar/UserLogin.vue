<script setup lang="ts">
import { ref } from 'vue';

const { reconnect = false } = defineProps<{
  /** Renewing the session this browser already has, whose cookie stays as it is */
  reconnect?: boolean;
}>();

const emit = defineEmits<{
  login: [keepSignedIn: boolean];
}>();

const keepSignedIn = ref(true);
</script>

<template>
  <div :class="$style.notLoggedInContainer">
    <div :class="$style.notLoggedIn">
      <p v-if="reconnect">Your connection to Strava has expired, please reconnect.</p>
      <p v-else>You are not logged in. Click to continue to log in with Strava.</p>
      <button type="button" :class="$style.connectToStrava" @click="emit('login', keepSignedIn)">
        <img src="@/assets/connect-to-strava.svg" alt="Connect with Strava" />
      </button>

      <label v-if="!reconnect">
        <input v-model="keepSignedIn" type="checkbox" />
        <div>
          <p>Keep me signed in</p>
          <p :class="$style.small">
            A cookie remembers your login for a year. Otherwise you will be signed out when you
            close your browser. Sign out under User to remove it.
          </p>
        </div>
      </label>
    </div>
  </div>
</template>

<style module lang="scss">
.notLoggedInContainer {
  background-color: var(--background-full);
  padding: 1em;
  position: sticky;
  bottom: 1em;
  z-index: 3; // opaque footer: sit above the z-indexed controls it can overlap

  .notLoggedIn {
    background-color: var(--background-weak);
    border-radius: var(--surface-border-radius);
    padding: 1em;

    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  p {
    margin: 0;
  }

  label {
    display: flex;
    align-items: baseline;
    gap: 0.25em;
  }

  .connectToStrava {
    all: unset;
    display: block;
    margin-inline: auto;
    cursor: pointer;

    // The image is Strava's and may not be altered, so the ring goes around it
    &:focus-visible {
      outline: 2px solid AccentColor;
      outline-offset: 2px;
    }
  }

  .centered {
    text-align: center;
  }

  .small {
    font-size: small;
  }
}
</style>
