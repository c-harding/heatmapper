import { type UserInfo } from '@strava-heatmapper/shared/interfaces';
import { type DeepReadonly, readonly, type Ref, ref, shallowReadonly } from 'vue';

import { type ContinueLogin, useContinueLogin } from './useContinueLogin';

export interface UseUser {
  user: Ref<UserInfo | undefined>;
  continueLogin: DeepReadonly<Ref<ContinueLogin | undefined>>;
  getUser(): Promise<void>;
}

export default function useUser(): UseUser {
  const { continueLogin, waitForLogin } = useContinueLogin();

  const user = ref<UserInfo>();

  async function getUser(token?: string) {
    const userResponse = await fetch('/api/user', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (userResponse.status === 200) {
      user.value = await userResponse.json();
    } else if (!token && userResponse.status === 403) {
      const data = (await userResponse.json()) as { token: string };
      const token = await waitForLogin(data.token, userResponse.headers.get('Location')!);
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
    user: shallowReadonly(user),
    continueLogin: readonly(continueLogin),
    getUser,
  };
}
