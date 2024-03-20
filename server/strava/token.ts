interface OAuthCallbackResponse {
  code: string;
  state: string;
  scope: string;
}

const callbacks = new Map<string, (registration: OAuthCallbackResponse) => Promise<void>>();

const CALLBACK_TIMEOUT = 15 * 60 * 1000; // 15 min

interface AddCallbackOptions {
  timeout?: number;
  signal?: AbortSignal;
}

export function addCallback(
  name: string,
  options?: AddCallbackOptions,
  mapper?: undefined,
): Promise<OAuthCallbackResponse>;
export function addCallback<T>(
  name: string,
  options: AddCallbackOptions,
  mapper: (response: OAuthCallbackResponse) => T,
): Promise<Awaited<T>>;
export function addCallback<T>(name: string, mapper: (response: OAuthCallbackResponse) => T): Promise<Awaited<T>>;
export function addCallback(
  name: string,
  arg2?: AddCallbackOptions | ((response: OAuthCallbackResponse) => unknown | Promise<unknown>),
  arg3?: (response: OAuthCallbackResponse) => unknown | Promise<unknown>,
): Promise<unknown> {
  const [options, mapper] = typeof arg2 === 'function' ? [undefined, arg2] : [arg2, arg3];
  const { timeout = CALLBACK_TIMEOUT, signal } = options ?? {};

  return new Promise((resolve, reject) => {
    callbacks.set(name, async (data) => {
      callbacks.delete(name);
      if (!mapper) {
        resolve(data);
      } else {
        try {
          resolve(mapper(data));
        } catch (e) {
          reject(e);
        }
      }
    });
    signal?.addEventListener('abort', () => reject({ error: 'Abort', cause: signal.reason }), { once: true });
    setTimeout(() => {
      callbacks.delete(name);
      reject({ error: 'Timeout', time: timeout });
    }, timeout);
  });
}

export function validTokenCallback(data: Partial<OAuthCallbackResponse>): data is OAuthCallbackResponse {
  const validString = (val: unknown): val is string => !!val && typeof val === 'string';
  return validString(data.code) && validString(data.state) && validString(data.scope);
}

export async function tokenExchange(data: OAuthCallbackResponse): Promise<boolean> {
  const resolver = callbacks.get(data.state);
  if (!resolver) return false;
  await resolver(data);
  return true;
}
