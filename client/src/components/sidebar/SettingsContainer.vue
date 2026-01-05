<script lang="ts" setup>
import { type UserInfo } from '@strava-heatmapper/shared/interfaces';

import CalendarSettings from './CalendarSettings.vue';
import UserSettings from './UserSettings.vue';

const { user } = defineProps<{
  user: UserInfo;
}>();

const emit = defineEmits<{
  logout: [];
}>();
</script>
<template>
  <UserSettings :user="user" @logout="emit('logout')" />
  <CalendarSettings :user="user" />
</template>

<style scoped lang="scss"></style>
