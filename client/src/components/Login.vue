<script setup lang="ts">
const emit = defineEmits<{
  (e: 'login'): void;
  (e: 'login-without-cookies'): void;
}>();
</script>

<template>
  <div class="not-logged-in-container">
    <div class="not-logged-in">
      <p>You are not logged in. Click to continue to log in with Strava.</p>
      <p class="centered">
        <button @click="emit('login')">Log in</button>
      </p>
      <p class="small">
        This will use a cookie to remember who you are logged in as, which you can clear at any time
        by clicking "Clear Cache". You may
        <a href="#no-cookies" @click.prevent="emit('login-without-cookies')"
          >proceed without cookies</a
        >
        if you wish to log in every time.
      </p>
    </div>
  </div>
</template>

<style lang="scss">
.not-logged-in-container {
  background-color: var(--background);
  padding: 1em;
  position: sticky;
  bottom: 1em;

  .not-logged-in {
    background-color: var(--background-strong);
    border-radius: 1em;
    padding: 1em;
  }

  p {
    margin-top: 0;
  }

  .centered {
    text-align: center;
  }
}
</style>
