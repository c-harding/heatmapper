interface OAuthCallbackResponse {
  code: string;
  state: string;
  scope: string;
}

const callbacks = new Map<string, (registration: OAuthCallbackResponse) => Promise<void>>();

const CALLBACK_TIMEOUT = 15 * 60 * 1000; // 15 min

export function addCallback(name: string, mapper?: undefined): Promise<OAuthCallbackResponse>;
export function addCallback<T>(name: string, mapper: (response: OAuthCallbackResponse) => T): Promise<Awaited<T>>;
export function addCallback(
  name: string,
  mapper?: (response: OAuthCallbackResponse) => unknown | Promise<unknown>,
): Promise<unknown> {
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
    setTimeout(() => {
      callbacks.delete(name);
      reject({ error: 'Timeout', time: CALLBACK_TIMEOUT });
    }, CALLBACK_TIMEOUT);
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
