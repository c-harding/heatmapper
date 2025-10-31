import { type UserInfo } from '@strava-heatmapper/shared/interfaces';
import { defineStore } from 'pinia';
import { type DeepReadonly, type Ref, ref, toRef } from 'vue';

import { type ContinueLogin, useContinueLoginStore } from './ContinueLoginStore';

export interface UseUser {
  user: Ref<UserInfo | undefined>;
  continueLogin: DeepReadonly<Ref<ContinueLogin | undefined>>;
  getUser(): Promise<void>;
}

export const useUserStore = defineStore('user', (): UseUser => {
  const continueLoginStore = useContinueLoginStore();

  const user = ref<UserInfo>();

  async function getUser(token?: string) {
    const userResponse = await fetch('/api/user', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (userResponse.status === 200) {
      user.value = await userResponse.json();
    } else if (!token && userResponse.status === 403) {
      const data = (await userResponse.json()) as { token: string };
      const token = await continueLoginStore.waitForLogin(
        data.token,
        userResponse.headers.get('Location')!,
      );
      await getUser(token);
    } else {
      console.error(
        'encountered error',
        userResponse.status,
        userResponse.statusText,
        await userResponse.text(),
      );
      throw new Error('Cannot load user information');
    }
  }

  return {
    user,
    continueLogin: toRef(continueLoginStore, 'continueLogin'),
    getUser,
  };
});
