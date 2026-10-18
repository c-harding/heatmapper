import { AbortError } from 'node-fetch';

interface OAuthCallbackResponse {
  code: string;
  state: string;
  scope: string;
}

type MaybePromise<T> = T | Promise<T>;

interface Waiter {
  mapper?: (response: OAuthCallbackResponse) => MaybePromise<unknown>;
  resolve: (value: unknown) => void;
}

/** Everyone waiting on each login, keyed by its state. The code it returns can only be used once. */
const waiters = new Map<string, Waiter[]>();

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
    // An aborted signal never fires its abort event again
    if (signal?.aborted) {
      reject(new AbortError('Login aborted'));
      return;
    }

    const removeOwn = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      const remaining = (waiters.get(name) ?? []).filter((other) => other !== waiter);
      if (remaining.length) waiters.set(name, remaining);
      else waiters.delete(name);
    };
    const waiter: Waiter = {
      mapper,
      resolve: (value) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(value);
      },
    };
    waiters.set(name, [...(waiters.get(name) ?? []), waiter]);

    const onAbort = () => {
      removeOwn();
      reject(new AbortError('Login aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => {
      removeOwn();
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);
  });
}

export function validTokenCallback(data: Partial<OAuthCallbackResponse>): data is OAuthCallbackResponse {
  const validString = (val: unknown): val is string => !!val && typeof val === 'string';
  return validString(data.code) && validString(data.state) && validString(data.scope);
}

export function tokenExchange(data: OAuthCallbackResponse): boolean {
  const waiting = waiters.get(data.state);
  if (!waiting) return false;
  waiters.delete(data.state);

  // Exchanges the code, so must run once, however many are waiting
  const mapper = waiting.find((waiter) => waiter.mapper)?.mapper;
  let mapped: Promise<unknown> | undefined;
  try {
    mapped = mapper && Promise.resolve(mapper(data));
  } catch (e) {
    mapped = Promise.reject(e);
  }

  for (const waiter of waiting) {
    if (waiter.mapper) waiter.resolve(mapped);
    else waiter.resolve(data);
  }
  return true;
}
