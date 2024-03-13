import { type User } from '@strava-heatmapper/shared/interfaces';
import { type DeepReadonly, onMounted, readonly, type Ref, ref } from 'vue';

import { type ContinueLogin, useContinueLogin } from './useContinueLogin';

export default function useUser(): {
  user: DeepReadonly<Ref<User | undefined>>;
  continueLogin: DeepReadonly<Ref<ContinueLogin | undefined>>;
} {
  const { continueLogin, waitForLogin } = useContinueLogin();

  const user = ref<User>();

  async function getUser(token?: string) {
    const userResponse = await fetch('/api/user', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (userResponse.status === 200) {
      user.value = await userResponse.json();
    } else if (userResponse.status === 403) {
      const data = (await userResponse.json()) as { token: string };
      const token = await waitForLogin(data.token, userResponse.headers.get('Location')!);
      await getUser(token);
    } else {
      console.error('encountered error', userResponse.status, userResponse.statusText);
    }
  }

  onMounted(getUser);

  return {
    user: readonly(user),
    continueLogin: readonly(continueLogin),
  };
}
