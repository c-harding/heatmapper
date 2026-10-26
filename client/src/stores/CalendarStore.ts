import { defineStore } from 'pinia';
import { ref } from 'vue';

import { TooltipError } from '@/components/tooltip/TooltipError';

import { useContinueLoginStore } from './ContinueLoginStore';
import { useUserStore } from './UserStore';

export const useCalendarStore = defineStore('calendar', () => {
  const continueLoginStore = useContinueLoginStore();
  const userStore = useUserStore();

  /** Whether a link is waiting to be created until the user reconnects to Strava */
  const awaitingReconnect = ref(false);

  /** Counts the creates finished after reconnecting, for the settings to show their result */
  const reconnected = ref(0);

  /** The login a create is waiting on, until that is dismissed */
  let waiting: { token: string } | undefined;

  /** Creates the calendar link, or keeps the one there is, and fetches the user to show it */
  async function create(): Promise<void> {
    let response: Response;
    try {
      response = await fetch('/api/calendar', { method: 'POST' });
    } catch (cause) {
      throw new TooltipError('Cannot reach Heatmapper, please check your connection', {
        timeout: 0,
        cause,
      });
    }

    const location = response.headers.get('Location');
    if (response.status === 403 && location) {
      const { token } = (await response.json()) as { token: string };
      const attempt = { token };
      waiting = attempt;
      awaitingReconnect.value = true;
      // Never settles once dismissed, as the login is then given up
      await continueLoginStore.waitForLogin(token, location, 'calendar');
      if (waiting !== attempt) return;
      waiting = undefined;
      awaitingReconnect.value = false;
      try {
        await create();
      } finally {
        reconnected.value++;
      }
      return;
    }

    if (response.status === 503) {
      throw new TooltipError('Strava is busy, please try again in a few minutes', { timeout: 0 });
    } else if (response.status === 502) {
      throw new TooltipError('Cannot reach Strava, please try again later', { timeout: 0 });
    } else if (!response.ok) {
      throw new TooltipError('Cannot create the link, please try again later', { timeout: 0 });
    }
    await userStore.getUser();
  }

  /** Deletes the calendar link, so that calendars subscribed to it stop updating */
  async function deleteCalendar(): Promise<void> {
    let response: Response;
    try {
      response = await fetch('/api/calendar', { method: 'DELETE' });
    } catch (cause) {
      throw new TooltipError('Cannot reach Heatmapper, please check your connection', {
        timeout: 0,
        cause,
      });
    }
    // Without a session there is no calendar either, and fetching the user asks for a login
    if (!response.ok && response.status !== 401) {
      throw new TooltipError('Cannot delete the link, please try again later', { timeout: 0 });
    }
    await userStore.getUser();
  }

  /** Gives up on the link and its login, which nothing else then asks for */
  function dismissReconnect() {
    if (waiting) continueLoginStore.cancelLogin(waiting.token, 'calendar');
    waiting = undefined;
    awaitingReconnect.value = false;
  }

  return {
    awaitingReconnect,
    reconnected,
    create,
    deleteCalendar,
    dismissReconnect,
  };
});
