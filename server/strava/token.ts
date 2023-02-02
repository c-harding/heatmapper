interface OAuthCallbackResponse {
  code: string;
  state: string;
  scope: string;
}

const callbacks = new Map<string, (registration: OAuthCallbackResponse) => void>();

const CALLBACK_TIMEOUT = 15 * 60 * 1000; // 15 min

export const addCallback = (name: string): Promise<OAuthCallbackResponse> =>
  new Promise((resolve, reject) => {
    callbacks.set(name, (data) => {
      callbacks.delete(name);
      resolve(data);
    });
    setTimeout(() => {
      callbacks.delete(name);
      reject();
    }, CALLBACK_TIMEOUT);
  });

export function validTokenCallback(data: Partial<OAuthCallbackResponse>): data is OAuthCallbackResponse {
  const validString = (val: unknown): val is string => !!val && typeof val === 'string';
  return validString(data.code) && validString(data.state) && validString(data.scope);
}

export function tokenExchange(data: OAuthCallbackResponse): boolean {
  const resolver = callbacks.get(data.state);
  if (!resolver) return false;
  resolver(data);
  return true;
}
