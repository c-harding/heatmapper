<script lang="ts" setup>
import { type User } from '@strava-heatmapper/shared/interfaces';
import { computed, onMounted, ref } from 'vue';

import { countOtherSessions } from '@/utils/strings';

import Login from './Login.vue';
import UIButton from './UIButton.vue';

const emit = defineEmits<{
  (e: 'logout'): void;
}>();

const continueLogin = ref<(withCookies: boolean) => void>();

const user = ref<User>();

async function getUser() {
  const userResponse = await fetch('/api/user');

  if (userResponse.status === 200) {
    user.value = await userResponse.json();
  } else if (userResponse.status === 403) {
    const data = (await userResponse.json()) as { token: string };
    continueLogin.value = async (cookies = true) => {
      if (cookies) document.cookie = `token=${data.token};max-age=31536000`;
      continueLogin.value = undefined;
      window.open(
        userResponse.headers.get('Location')!,
        'menubar=false,toolbar=false,width=300, height=300',
      );

      await new Promise<void>((resolve) => {
        const eventHandler = (e: MessageEvent<string>) => {
          if (e.data === 'heatmapper:logged-in') {
            window.removeEventListener('message', eventHandler);
            resolve();
          }
        };

        window.addEventListener('message', eventHandler);
      });
      await getUser();
    };
  } else {
    console.error('encountered error', userResponse.status, userResponse.statusText);
  }
}

onMounted(getUser);

const imgSrc = computed<string | undefined>(() => user.value?.image62);
const imgSrcSet = computed<string | undefined>(() => {
  if (!user.value) return;
  return [
    { src: user.value.image62, width: 62 },
    { src: user.value.image114, width: 114 },
  ]
    .filter(({ src }) => src)
    .map(({ src, width }) => `${src} ${width}w`)
    .join(', ');
});

const fullName = computed<string | undefined>(
  () => user.value && [user.value?.firstName, user.value?.lastName].filter(Boolean).join(' '),
);

const profileLink = computed(
  () => user.value && `https://www.strava.com/athletes/${user.value.id}`,
);

const otherSessions = computed<number>(() =>
  user.value ? Math.max(user.value.sessions.length - 1, 0) : 0,
);

const logout = async (global = false) => {
  const url = global ? '/api/user?global' : '/api/user';
  const response = await fetch(url, { method: 'DELETE' });
  if (response.status >= 200 && response.status < 300) emit('logout');
  else {
    loggingOut.value = undefined;
    // TODO: handle error
  }
};

const loggingOut = ref<{ global: boolean }>();
</script>
<template>
  <h2>User settings</h2>
  <Login v-if="continueLogin" @login="continueLogin($event)" />
  <p v-else-if="!user">Loading…</p>
  <template v-else>
    <div class="flex-line">
      <img class="profile-pic" :srcset="imgSrcSet" :src="imgSrc" />
      <a :href="profileLink" target="_blank">{{ fullName }}</a>
      <UIButton @click="logout(false)"> Sign out </UIButton>
    </div>
    <div class="flex-line">
      <p v-if="otherSessions">You are signed in in {{ countOtherSessions(otherSessions) }}.</p>
      <p v-else>You are not signed in anywhere else.</p>
      <UIButton :disabled="!otherSessions" @click="logout(true)"> Sign out everywhere </UIButton>
    </div>
  </template>
</template>

<style scoped lang="scss">
.profile-pic {
  width: 31px;
  border-radius: 50%;
}

.flex-line {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-block: 0.5em;

  > button {
    margin-left: auto;
  }
}

a {
  color: var(--bold-color);

  &:not(:hover) {
    text-decoration: none;
  }
}
</style>
