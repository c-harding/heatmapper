<script lang="ts" setup>
import { computed } from 'vue';

import { useCalendarStore } from '@/stores/CalendarStore';
import { useContinueLoginStore } from '@/stores/ContinueLoginStore';

import UIModal from '../ui/UIModal.vue';
import LoginPrompt from './LoginPrompt.vue';

const calendarStore = useCalendarStore();
const continueLoginStore = useContinueLoginStore();

// Closing it gives up on the link and its login
const open = computed({
  get: () => calendarStore.awaitingReconnect,
  set: (isOpen) => {
    if (!isOpen) calendarStore.dismissReconnect();
  },
});
</script>
<template>
  <UIModal v-model="open" heading="Reconnect to Strava">
    <LoginPrompt reconnect @login="continueLoginStore.continueLogin?.($event)" />
  </UIModal>
</template>
