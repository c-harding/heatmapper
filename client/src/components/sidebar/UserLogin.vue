<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  login: [useCookie: boolean];
}>();

const useCookie = ref(true);
</script>

<template>
  <div :class="$style.notLoggedInContainer">
    <div :class="$style.notLoggedIn">
      <p>You are not logged in. Click to continue to log in with Strava.</p>
      <img
        :class="$style.connectToStrava"
        src="@/assets/connect-to-strava.svg"
        @click="emit('login', useCookie)"
      />

      <label>
        <input v-model="useCookie" type="checkbox" />
        <div>
          <p>Keep me logged in</p>
          <p :class="$style.small">
            This will use a cookie to remember who you are logged in as, which you can clear at any
            time by clicking "Clear Cache".
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

  .notLoggedIn {
    background-color: var(--background-weak);
    border-radius: 1em;
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
    display: block;
    margin-inline: auto;
  }

  .centered {
    text-align: center;
  }

  .small {
    font-size: small;
  }
}
</style>
