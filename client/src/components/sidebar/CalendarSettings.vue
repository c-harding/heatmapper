<script lang="ts" setup>
import { type UserInfo } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import UIButton from '../ui/UIButton.vue';

const { user } = defineProps<{
  user: UserInfo;
}>();

const hasPrivateActivities = computed(() => user.privateCalendar);
</script>
<template>
  <h3>Calendar</h3>
  <template v-if="user.calendarUrl">
    <p v-if="hasPrivateActivities">You have a calendar connection including private activities.</p>
    <p v-else>You have a calendar connection excluding private activities.</p>
    <p>{{ user.calendarUrl }}</p>
    <UIButton>Disconnect</UIButton>
  </template>
  <template v-else>
    <p>You do not yet have a calendar connection.</p>
    <img class="connect-to-strava" src="@/assets/connect-to-strava.svg" />
  </template>
</template>

<style scoped lang="scss">
.connect-to-strava {
  display: block;
  margin: auto;
}
</style>
