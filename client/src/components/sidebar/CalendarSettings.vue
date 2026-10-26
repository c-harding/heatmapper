<script lang="ts" setup>
import { type UserInfo } from '@strava-heatmapper/shared/interfaces';
import { ref } from 'vue';

import { useCalendarStore } from '@/stores/CalendarStore';
import { useResettingRef } from '@/utils/resetting-ref';

import { TooltipError } from '../tooltip/TooltipError';
import UIButton from '../ui/UIButton.vue';
import UIExternalLink from '../ui/UIExternalLink.vue';
import UILabelledIcon from '../ui/UILabelledIcon.vue';
import UIModal from '../ui/UIModal.vue';
import UIMultiText from '../ui/UIMultiText.vue';
import UITextField from '../ui/UITextField.vue';

const { user } = defineProps<{
  user: UserInfo;
}>();

/** Hands the address to the system's calendar app */
function subscribe(url: string) {
  window.location.href = url;
}

const copied = useResettingRef(false, 2000);

const calendarStore = useCalendarStore();

const confirmingDelete = ref(false);

function confirmDelete(open: boolean) {
  confirmingDelete.value = open;
}

async function deleteCalendar() {
  await calendarStore.deleteCalendar();
  confirmingDelete.value = false;
}

async function copy(url: string) {
  try {
    await navigator.clipboard.writeText(url);
  } catch (cause) {
    throw new TooltipError('Cannot copy, please select the address and copy it', { cause });
  }
  copied.value = true;
}
</script>
<template>
  <h3>Calendar</h3>
  <template v-if="user.calendarUrls">
    <p>
      Your activities are available as a calendar. Calendar apps usually check for new ones every
      few hours.
    </p>
    <div :class="$style.action">
      <UIButton icon="calendar_today" @click="subscribe(user.calendarUrls.webcal)">
        Subscribe in a calendar app
      </UIButton>
    </div>
    <div :class="$style.flexLine">
      <label :class="$style.address">
        <span>Or add it by address:</span>
        <UITextField
          :modelValue="user.calendarUrls.https"
          readonly
          @focusin="(event: FocusEvent) => (event.target as HTMLInputElement).select()"
        />
      </label>
      <UIButton :loadingDelay="100" @click="copy(user.calendarUrls.https)">
        <UIMultiText :selected="copied ? 'copied' : 'copy'" aria-live="polite">
          <template #copy>
            <UILabelledIcon icon="content_copy">Copy</UILabelledIcon>
          </template>
          <template #copied>
            <UILabelledIcon icon="check">Copied</UILabelledIcon>
          </template>
        </UIMultiText>
      </UIButton>
    </div>
    <div :class="$style.deleteLine">
      <div>Deleting the link stops every calendar subscribed to it.</div>
      <UIButton danger @click="confirmDelete(true)">Delete link</UIButton>
    </div>
  </template>
  <template v-else>
    <p>
      See your activities in Apple Calendar, Google Calendar or Outlook, kept up to date. The link
      is private: anyone who has it can see your activities.
    </p>
    <div :class="$style.action">
      <UIButton @click="calendarStore.create()">Create calendar link</UIButton>
    </div>
  </template>
  <p>
    <UIExternalLink href="/calendar">Manage your calendar link</UIExternalLink>
  </p>
  <UIModal v-model="confirmingDelete" heading="Delete this calendar link?">
    <p>
      Calendars subscribed to it will stop updating. You can create a new link at any time, at a new
      address.
    </p>
    <div :class="$style.confirmButtons">
      <UIButton @click="confirmDelete(false)">Cancel</UIButton>
      <UIButton danger @click="deleteCalendar">Delete link</UIButton>
    </div>
  </UIModal>
</template>

<style module lang="scss">
// As the user settings' rows: the sentence, then its button at the end
.deleteLine {
  margin-inline-end: -0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5em;

  > button {
    margin-inline-start: auto;
  }
}

.confirmButtons {
  display: flex;
  justify-content: flex-end;
  margin-inline-end: -0.5rem;
}

.action {
  margin-inline: -0.5rem;
  margin-block: 1rem;
}

// Takes back the controls' own margin, so they line up with the text on both sides
.flexLine {
  margin-inline: -0.5rem;
  display: flex;
  flex-wrap: wrap;
  align-items: end;
}

.address {
  flex: 1 1 12em;
  min-width: 0;
  display: flex;
  flex-direction: column;

  > span {
    margin-inline-start: 0.5rem;
    font-size: 0.875rem;
  }
}
</style>
