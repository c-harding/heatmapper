interface OAuthCallbackResponse {
  code: string;
  state: string;
  scope: string;
}

type MaybePromise<T> = T | Promise<T>;

const callbacks = new Map<string, (registration: OAuthCallbackResponse) => void>();

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
  arg2?: AddCallbackOptions | ((response: OAuthCallbackResponse) => MaybePromise<unknown>),
  arg3?: (response: OAuthCallbackResponse) => MaybePromise<unknown>,
): Promise<unknown> {
  const [options, mapper] = typeof arg2 === 'function' ? [undefined, arg2] : [arg2, arg3];
  const { timeout = CALLBACK_TIMEOUT, signal } = options ?? {};

  return new Promise((resolve, reject) => {
    callbacks.set(name, (data) => {
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
    signal?.addEventListener(
      'abort',
      () => {
        reject(new Error('Abort', { cause: signal.reason }));
      },
      { once: true },
    );
    setTimeout(() => {
      callbacks.delete(name);
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);
  });
}

export function validTokenCallback(data: Partial<OAuthCallbackResponse>): data is OAuthCallbackResponse {
  const validString = (val: unknown): val is string => !!val && typeof val === 'string';
  return validString(data.code) && validString(data.state) && validString(data.scope);
}

export function tokenExchange(data: OAuthCallbackResponse): boolean {
  const resolver = callbacks.get(data.state);
  if (!resolver) return false;
  resolver?.(data);
  return true;
}
