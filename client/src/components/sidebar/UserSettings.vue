<script setup lang="ts">
import { type UserInfo } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import { countOtherSessions } from '@/utils/strings';

import { TooltipError } from '../tooltip/TooltipError';
import UIButton from '../ui/UIButton.vue';

const { user } = defineProps<{
  user: UserInfo;
}>();

const emit = defineEmits<{
  logout: [];
}>();

const imgSrc = computed<string | undefined>(() => user.image62);
const imgSrcSet = computed<string | undefined>(() => {
  if (!user) return;
  return [
    { src: user.image62, width: 62 },
    { src: user.image124, width: 124 },
  ]
    .filter(({ src }) => src)
    .map(({ src, width }) => `${src} ${width}w`)
    .join(', ');
});

const fullName = computed<string | undefined>(
  () => user && [user.firstName, user.lastName].filter(Boolean).join(' '),
);

const profileLink = computed(() => user && `https://www.strava.com/athletes/${user.id}`);

const otherSessions = computed<number>(() => (user ? Math.max(user.sessionCount - 1, 0) : 0));

const logout = async (global = false) => {
  const url = global ? '/api/user?global' : '/api/user';
  let error: unknown = undefined;
  try {
    const response = await fetch(url, { method: 'DELETE' });
    if (response.status >= 200 && response.status < 300) {
      emit('logout');
      return;
    } else error = response;
  } catch (e) {
    error = e;
  }
  throw new TooltipError('Cannot log out, please try again later', { cause: error });
};
</script>
<template>
  <h2>User settings</h2>

  <div :class="$style.flexLine">
    <img :class="$style.profilePic" :srcset="imgSrcSet" :src="imgSrc" />
    <a :href="profileLink" :class="$style.userName" target="_blank">{{ fullName }}</a>
    <UIButton @click="logout(false)"> Sign out </UIButton>
  </div>
  <div :class="$style.flexLine">
    <p v-if="otherSessions">You are signed in in {{ countOtherSessions(otherSessions) }}.</p>
    <p v-else>You are not signed in anywhere else.</p>
    <UIButton :disabled="!otherSessions" @click="logout(true)"> Sign out everywhere </UIButton>
  </div>
</template>

<style module lang="scss">
.profilePic {
  width: 31px;
  border-radius: 50%;
}

.flexLine {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-block: 0.5em;

  > button {
    margin-left: auto;
  }
}

a.userName {
  color: var(--bold-color);
  font-weight: 600;

  &:not(:hover) {
    text-decoration: none;
  }
}
</style>
