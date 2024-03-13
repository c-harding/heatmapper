import { type User } from '@strava-heatmapper/shared/interfaces';
import { type DeepReadonly, onMounted, readonly, type Ref, ref } from 'vue';

type ContinueLogin = (withCookies: boolean) => void;

export default function useUser(): {
  user: DeepReadonly<Ref<User | undefined>>;
  continueLogin: Ref<ContinueLogin | undefined>;
} {
  const continueLogin = ref<ContinueLogin>();

  const user = ref<User>();

  async function getUser() {
    const userResponse = await fetch('/api/user');

    if (userResponse.status === 200) {
      user.value = await userResponse.json();
    } else if (userResponse.status === 403) {
      const data = (await userResponse.json()) as { token: string };
      continueLogin.value = async (withCookies = true) => {
        if (withCookies) {
          document.cookie = `token=${data.token};max-age=31536000`;
        }
        window.open(
          userResponse.headers.get('Location')!,
          'menubar=false,toolbar=false,width=300, height=300',
        );

        await new Promise<void>((resolve) => {
          const eventHandler = (e: MessageEvent<string>) => {
            if (e.data === 'heatmapper:logged-in') {
              continueLogin.value = undefined;
              window.removeEventListener('message', eventHandler);
              resolve();
            }
          };

          window.addEventListener('message', eventHandler);
        });
        await getUser();
      };
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
