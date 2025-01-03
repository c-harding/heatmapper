<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  login: [useCookie: boolean];
}>();

const useCookie = ref(true);
</script>

<template>
  <div class="not-logged-in-container">
    <div class="not-logged-in">
      <p>You are not logged in. Click to continue to log in with Strava.</p>
      <img
        class="connect-to-strava"
        src="@/assets/connect-to-strava.svg"
        @click="emit('login', useCookie)"
      />

      <label>
        <input v-model="useCookie" type="checkbox" />
        <div>
          <p>Keep me logged in</p>
          <p class="small">
            This will use a cookie to remember who you are logged in as, which you can clear at any
            time by clicking "Clear Cache".
          </p>
        </div>
      </label>
    </div>
  </div>
</template>

<style lang="scss">
.not-logged-in-container {
  background-color: var(--background-full);
  padding: 1em;
  position: sticky;
  bottom: 1em;

  .not-logged-in {
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

  .connect-to-strava {
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
