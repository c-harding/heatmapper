import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ContinueLogin = (keepSignedIn: boolean) => void;

/** What asked for a login: each can only prove its own login has gone through */
export type LoginOrigin = 'user' | 'socket' | 'calendar';

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

  /** Whether the login prompt renews the session in the cookie, rather than starting one */
  const reconnecting = ref(false);

  const waiting = new Map<string, Wait[]>();
  const messageHandlers = new Map<string, (e: MessageEvent<string>) => void>();

  /**
   * Finish the waits for a token's login. Without an origin, the login itself was seen to
   * complete, which finishes every wait.
   */
  function loggedIn(token: string, origin?: LoginOrigin) {
    endWaits(token, origin).forEach((wait) => wait.resolve(token));
  }

  /** Give up one origin's wait for a login, keeping the prompt for any other still waiting */
  function cancelLogin(token: string, origin: LoginOrigin) {
    endWaits(token, origin);
  }

  /** Take the waits for a token's login, from one origin or all, and the prompt with the last */
  function endWaits(token: string, origin?: LoginOrigin): Wait[] {
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
        reconnecting.value = false;
      }
    }

    return finished;
  }

  function waitForLogin(token: string, location: string, origin: LoginOrigin) {
    promptToken = token;
    reconnecting.value = token === cookieToken();
    continueLogin.value = (keepSignedIn = true) => {
      // A reconnection keeps the cookie it has, and so how long that lasts
      if (token !== cookieToken()) {
        // Without a max-age, the cookie lasts until the browser closes
        const lifetime = keepSignedIn ? ';max-age=31536000' : '';
        const secure = window.location.protocol === 'https:' ? ';Secure' : '';
        document.cookie = `token=${token};SameSite=Lax${secure}${lifetime}`;
      }
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
    reconnecting,

    waitForLogin,
    loggedIn,
    cancelLogin,
  };
});
