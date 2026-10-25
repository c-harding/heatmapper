<script setup lang="ts">
import { type UserInfo } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import { countOtherSessions } from '@/utils/strings';

import { TooltipError } from '../tooltip/TooltipError';
import UIButton from '../ui/UIButton.vue';
import UIExternalLink from '../ui/UIExternalLink.vue';

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
// The calendar counts as a session, but is not somewhere the user is signed in
const hasCalendar = computed(() => !!user?.calendarUrls);
const otherBrowsers = computed(() =>
  Math.max(otherSessions.value - (hasCalendar.value ? 1 : 0), 0),
);

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
  <h3>User Settings</h3>
  <div :class="$style.flexLine">
    <img :class="$style.profilePic" :srcset="imgSrcSet" :src="imgSrc" />
    <UIExternalLink :href="profileLink" :class="$style.userName">{{ fullName }}</UIExternalLink>
    <UIButton @click="logout(false)"> Sign out </UIButton>
  </div>
  <div :class="$style.flexLine">
    <div v-if="otherBrowsers && hasCalendar">
      You are signed in in {{ countOtherSessions(otherBrowsers) }} and a calendar.
    </div>
    <div v-else-if="otherBrowsers">
      You are signed in in {{ countOtherSessions(otherBrowsers) }}.
    </div>
    <div v-else-if="hasCalendar">Apart from a calendar, you are not signed in anywhere else.</div>
    <div v-else>You are not signed in anywhere else.</div>
    <UIButton danger :disabled="!otherSessions" @click="logout(true)">
      Sign out everywhere
    </UIButton>
  </div>
</template>

<style module lang="scss">
.profilePic {
  width: 31px;
  border-radius: 50%;
}

.flexLine {
  margin-inline-end: -0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-block: 0.5em;

  > button {
    margin-inline-start: auto;
  }
}

// More specific than the app's own a[href], which would otherwise colour it as a plain link
a[href].userName {
  color: var(--bold-color);
  font-weight: 600;

  &:not(:hover) {
    text-decoration: none;
  }
}
</style>
