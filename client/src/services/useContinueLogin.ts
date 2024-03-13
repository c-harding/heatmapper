import { readonly, type Ref, ref } from 'vue';

export type ContinueLogin = (withCookies: boolean) => void;

export function useContinueLogin(): {
  continueLogin: Readonly<Ref<ContinueLogin | undefined>>;
  waitForLogin(token: string, location: string): Promise<string>;
} {
  const continueLogin = ref<ContinueLogin>();

  async function waitForLogin(token: string, location: string) {
    return new Promise<string>((resolve) => {
      function messageHandler(e: MessageEvent<string>) {
        if (e.data === 'heatmapper:logged-in') {
          continueLogin.value = undefined;
          window.removeEventListener('message', messageHandler);
          resolve(token);
        }
      }

      continueLogin.value = async (withCookies = true) => {
        if (withCookies) {
          document.cookie = `token=${token};max-age=31536000`;
        }
        window.addEventListener('message', messageHandler);
        window.open(location, 'menubar=false,toolbar=false,width=300, height=300');
      };
    });
  }

  return {
    continueLogin: readonly(continueLogin),

    waitForLogin,
  };
}
