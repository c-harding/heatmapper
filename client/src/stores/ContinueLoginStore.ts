import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ContinueLogin = (keepSignedIn: boolean) => void;

/** What asked for a login: each can only prove its own login has gone through */
export type LoginOrigin = 'user' | 'socket';

/** The token in the login cookie, if there is one */
export function cookieToken(): string | undefined {
  return /(?:^|;\s*)token=([^;]+)/.exec(document.cookie)?.[1];
}

interface Wait {
  origin: LoginOrigin;
  resolve: (token: string) => void;
}

export const useContinueLoginStore = defineStore('continueLogin', () => {
  const continueLogin = ref<ContinueLogin>();

  /** The token that the login prompt is for */
  let promptToken: string | undefined;

  const waiting = new Map<string, Wait[]>();
  const messageHandlers = new Map<string, (e: MessageEvent<string>) => void>();

  /**
   * Finish the waits for a token's login. Without an origin, the login itself was seen to
   * complete, which finishes every wait.
   */
  function loggedIn(token: string, origin?: LoginOrigin) {
    const waits = waiting.get(token) ?? [];
    const finished = waits.filter((wait) => !origin || wait.origin === origin);
    const remaining = waits.filter((wait) => !finished.includes(wait));

    if (remaining.length) {
      waiting.set(token, remaining);
    } else {
      waiting.delete(token);
      const messageHandler = messageHandlers.get(token);
      if (messageHandler) window.removeEventListener('message', messageHandler);
      messageHandlers.delete(token);
      if (promptToken === token) {
        continueLogin.value = undefined;
        promptToken = undefined;
      }
    }

    finished.forEach((wait) => wait.resolve(token));
  }

  function waitForLogin(token: string, location: string, origin: LoginOrigin) {
    promptToken = token;
    continueLogin.value = (keepSignedIn = true) => {
      // Without a max-age, the cookie lasts until the browser closes
      document.cookie = `token=${token}${keepSignedIn ? ';max-age=31536000' : ''}`;
      if (!messageHandlers.has(token)) {
        const messageHandler = (e: MessageEvent<string>) => {
          if (e.data === 'heatmapper:logged-in') loggedIn(token);
        };
        messageHandlers.set(token, messageHandler);
        window.addEventListener('message', messageHandler);
      }
      window.open(location, 'menubar=false,toolbar=false,width=300, height=300');
    };

    return new Promise<string>((resolve) => {
      waiting.set(token, [...(waiting.get(token) ?? []), { origin, resolve }]);
    });
  }

  return {
    continueLogin,

    waitForLogin,
    loggedIn,
  };
});
