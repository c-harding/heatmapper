import {
  SESSIONS_DIR,
  STRAVA_BASE_URL,
  STRAVA_BROWSER_BASE_URL,
  STRAVA_CLIENT_ID as stravaClientId,
  STRAVA_CLIENT_SECRET as stravaClientSecret,
} from '@strava-heatmapper/shared/config/dotenv';
import { type UserCache } from '@strava-heatmapper/shared/interfaces';
import { readFile } from 'fs/promises';
import fetch, { AbortError, type Response } from 'node-fetch';
import { join } from 'path';
import { v4 as uuid, validate as validateUUID } from 'uuid';

import LoginError, { CannotLogin, InvalidLogin, NeedsLogin } from '../login-error';
import { deleteFile, updateFile } from './file';
import { type SummaryAthlete } from './model';
import { addCallback } from './token';

const sessionCacheFile = (token: string) => join(SESSIONS_DIR, `${token}.json`);
const userCacheFile = (userId: number) => join(SESSIONS_DIR, `user-${userId}.json`);

/** How long before its expiry an access token is replaced, so that one sent can't expire on the way */
const EXPIRY_MARGIN = 5 * 60;

/** The refresh under way for each session, which every request finding its token expired waits on */
const refreshes = new Map<string, Promise<string>>();

/** How long Strava has to answer for tokens, as no one request's closing gives up on them */
const TOKEN_TIMEOUT = 30_000;

/** Waits for a promise, unless the signal aborts first */
function untilAborted<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new AbortError('Request aborted'));
    // An aborted signal never fires its abort event again
    if (signal.aborted) onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

export enum SessionType {
  DEFAULT = 'DEFAULT',
  CALENDAR = 'CALENDAR',
}

interface Cache {
  stravaRefreshToken: string;
  stravaAthlete: number;
  stravaAccessToken?: string;
  stravaExpiry?: number;
  stravaScope?: string[];
  sessionType?: SessionType;
}

/** A reply from Strava that is not a success */
export class StravaError extends Error {
  name = 'StravaError';

  constructor(
    readonly status: number,
    message: string,
    /** What Strava says was wrong, e.g. `{ resource: 'RefreshToken', field: 'refresh_token', code: 'invalid' }` */
    readonly errors: { resource?: string; field?: string; code?: string }[] = [],
  ) {
    super(message);
  }

  static async from(res: Response): Promise<StravaError> {
    let message = res.statusText;
    let errors: StravaError['errors'] = [];
    try {
      const body = (await res.json()) as { message?: string; errors?: StravaError['errors'] };
      message = body.message ?? message;
      errors = body.errors ?? errors;
    } catch {
      // Not JSON, so keep the status text
    }
    return new StravaError(res.status, `Strava replied ${res.status}: ${message}`, errors);
  }
}

export default class RawStravaApi {
  private readonly token: string;

  constructor(
    private readonly domain: string,
    requestToken: string | undefined,
    private readonly loginCallback: ((token: string, url: string) => Promise<boolean>) | null,
    private readonly abortSignal?: AbortSignal,
    private readonly sessionType = SessionType.DEFAULT,
  ) {
    this.token = requestToken && validateUUID(requestToken) ? requestToken : uuid();
  }

  private async loadCache(): Promise<Cache> {
    let cache: Cache;
    try {
      cache = JSON.parse(await readFile(sessionCacheFile(this.token), 'utf-8'));
    } catch (e) {
      throw new NeedsLogin('Could not load from cache', { cause: e });
    }
    if (this.sessionType !== (cache.sessionType ?? SessionType.DEFAULT)) {
      throw new InvalidLogin('Token not valid');
    }
    if (!cache.stravaAthlete || !cache.stravaRefreshToken) {
      throw new NeedsLogin('Loaded from cache, but athlete or refresh token is missing');
    }
    const currentEpochSeconds = Date.now() / 1e3;
    if (cache.stravaExpiry && cache.stravaExpiry < currentEpochSeconds + EXPIRY_MARGIN) {
      delete cache.stravaAccessToken;
    }
    return cache;
  }

  /**
   * Updates cached strava authentication tokens if necessary
   */
  private async getStravaToken(): Promise<string>;
  private async getStravaToken(scope: string, authCode: string): Promise<string>;
  private async getStravaToken(scope?: string, authCode?: string): Promise<string> {
    if (authCode) return await this.fetchTokens({ grant_type: 'authorization_code', code: authCode }, scope);

    const cache = await this.loadCache();
    if (cache.stravaAccessToken) return cache.stravaAccessToken;

    return await untilAborted(this.sharedRefresh(cache.stravaRefreshToken), this.abortSignal);
  }

  /** The session's refresh under way, or a new one that later requests will wait on in turn */
  private sharedRefresh(refreshToken: string): Promise<string> {
    let refresh = refreshes.get(this.token);
    if (!refresh) {
      refresh = this.fetchTokens({ refresh_token: refreshToken }).finally(() => refreshes.delete(this.token));
      refreshes.set(this.token, refresh);
    }
    return refresh;
  }

  /**
   * Gets new tokens and saves them to the session. A code serves every request waiting on its login,
   * and a refresh every request on the session, so neither is given up with this request.
   */
  private async fetchTokens(
    params: { refresh_token: string } | { code: string; grant_type: string },
    scope?: string,
  ): Promise<string> {
    const res = await fetch(`${STRAVA_BASE_URL}/oauth/token`, {
      method: 'post',
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: stravaClientId,
        client_secret: stravaClientSecret,
        ...params,
      }),
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TOKEN_TIMEOUT),
    });
    if (!res.ok) throw await StravaError.from(res);
    const data = (await res.json()) as {
      expires_at: number;
      refresh_token: string;
      access_token: string;
      athlete?: SummaryAthlete;
    };

    const athlete = data.athlete;

    await Promise.all([
      updateFile<Partial<Cache> & Pick<Cache, 'stravaAthlete'>>(
        sessionCacheFile(this.token),
        () => {
          if (!athlete) throw new Error('Did not receive Athlete ID on first login');
          return { stravaAthlete: athlete.id };
        },
        (oldCache): Cache => ({
          ...oldCache,
          stravaScope: scope ? scope.split(',') : oldCache.stravaScope,
          stravaAccessToken: data.access_token,
          stravaRefreshToken: data.refresh_token,
          stravaExpiry: data.expires_at,
        }),
      ),
      athlete &&
        updateFile<Partial<UserCache>, UserCache>(userCacheFile(athlete.id), {}, (oldUser) =>
          this.athleteToUser(athlete, oldUser),
        ),
    ]);

    return data.access_token;
  }

  async getUserId(): Promise<number> {
    let cache: Cache;
    try {
      cache = await this.loadCache();
    } catch (e) {
      if (e instanceof InvalidLogin) throw e;
      await this.getAccessTokenFromBrowser();
      cache = await this.loadCache();
    }
    return cache.stravaAthlete;
  }

  async getUserCache(): Promise<UserCache> {
    const userId = await this.getUserId();
    try {
      const jsonStr = await readFile(userCacheFile(userId), 'utf-8');
      const user = JSON.parse(jsonStr) as UserCache;
      // if the ID is missing, we refetch the data,
      // because the existing cache file comes from a manual migration script
      // and it does not include the username
      if (user.id) return user;
      else {
        // ID is missing, fallthrough to after the try-catch
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
        // Cache is missing, fallthrough to after the try-catch
      } else throw err;
    }

    const athlete = await this.get<SummaryAthlete>('/athlete');
    return await updateFile<Partial<UserCache>, UserCache>(userCacheFile(athlete.id), {}, (oldUser) =>
      this.athleteToUser(athlete, oldUser),
    );
  }

  private athleteToUser(athlete: SummaryAthlete, oldUser: Partial<UserCache>): UserCache {
    return {
      ...oldUser,
      id: athlete.id,
      firstName: athlete.firstname,
      lastName: athlete.lastname,
      image62: athlete.profile_medium,
      image124: athlete.profile,
      sessions: Array.from(new Set<string>(oldUser.sessions).add(this.token)),
    };
  }

  async hasToken(): Promise<boolean> {
    try {
      await this.loadCache();
      return true;
    } catch (e) {
      return false;
    }
  }

  private async rawStravaAPI(endpoint: string, query: Record<string, string | number | undefined> = {}) {
    const API_BASE = `${STRAVA_BASE_URL}/api/v3`;
    const queryString = (Object.entries(query).filter(([, value]) => value) as [string, string | number][])
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const API = `${API_BASE}${endpoint}?${queryString}`;

    const data = await fetch(API, {
      headers: { Authorization: `Bearer ${await this.getStravaToken()}` },
      signal: this.abortSignal,
    });
    return data;
  }

  private async getAccessTokenFromBrowser(): Promise<void> {
    if (!this.loginCallback) throw new CannotLogin('requestLogin is null');
    const athleteInfoPromise = addCallback(this.token, { signal: this.abortSignal }, (oauthResponse) => {
      return this.getStravaToken(oauthResponse.scope, oauthResponse.code);
    });

    const redirectUrl = `${this.domain}/api/token`;
    const scope = ['read_all', 'activity:read', 'activity:read_all'].join(',');
    const continueAfterLogin = await this.loginCallback(
      this.token,
      `${STRAVA_BROWSER_BASE_URL}/oauth/authorize?client_id=${stravaClientId}&response_type=code&redirect_uri=${redirectUrl}&state=${this.token}&approval_prompt=auto&scope=${scope}`,
    );

    try {
      await athleteInfoPromise;

      // If we do not continue after login, return a never-resolving promise.
      // This prevents the subsequent request from completing.
      if (!continueAfterLogin) await new Promise(() => undefined);
    } catch (e) {
      // A closed request cannot log in, and retrying would only wait on it again
      if (this.abortSignal?.aborted) throw e;
      if (continueAfterLogin) {
        await this.getAccessTokenFromBrowser();
      }
    }
  }

  /** Asks Strava for new tokens even when the cached access token is still good */
  private async refreshTokens(): Promise<string> {
    const { stravaRefreshToken } = await this.loadCache();
    return await this.sharedRefresh(stravaRefreshToken);
  }

  /**
   * Whether Strava confirms it has withdrawn this app's access for an athlete, by refreshing one of
   * their sessions: a webhook event alone can be forged. Throws if Strava cannot be asked.
   */
  static async isDeauthorised(domain: string, athlete: number): Promise<boolean> {
    let user: UserCache;
    try {
      user = JSON.parse(await readFile(userCacheFile(athlete), 'utf-8'));
    } catch {
      return false;
    }

    // Any session that still refreshes means access remains. With none left to ask, there are no
    // credentials to protect, so the record goes.
    for (const token of user.sessions) {
      try {
        await new RawStravaApi(domain, token, null).refreshTokens();
        return false;
      } catch (e) {
        // Not a 400/401 alone: Strava also answers 401 when this app's own credentials are wrong
        const refused = e instanceof StravaError && e.errors.some((error) => error.resource === 'RefreshToken');
        // A session whose file is gone cannot be asked about, but another may
        if (!refused && !(e instanceof LoginError)) throw e;
      }
    }
    return true;
  }

  async logoutGlobal(athlete?: number) {
    try {
      const atheleteId = athlete || (await this.loadCache()).stravaAthlete;
      const user = await deleteFile<UserCache>(userCacheFile(atheleteId), true);
      const sessions = new Set(user?.sessions).add(this.token);
      if (user?.calendarSession) sessions.add(user.calendarSession);

      // Delete all sessions belonging to this user, including the current session
      await Promise.all(Array.from(sessions, (session) => deleteFile(sessionCacheFile(session))));
    } catch (e) {
      if (e instanceof LoginError) return;
      else throw e;
    }
  }

  async logout() {
    try {
      const cache = await this.loadCache();
      await updateFile<Partial<UserCache>>(userCacheFile(cache.stravaAthlete), undefined, (user) => {
        // Remove the session from this file
        user.sessions = user.sessions?.filter((value) => value !== this.token) ?? [];

        if (user.sessions.length > 0 || user.calendarSession) {
          return user;
        } else {
          // null => delete the file
          return null;
        }
      });
      await deleteFile(sessionCacheFile(this.token));
    } catch (e) {
      if (e instanceof LoginError) return;
      else throw e;
    }
  }

  /**
   * Replace any word in curly braces in the URL with the appropriate value.
   * @param endpoint The URL to interpolate in.
   */
  private async interpolateEndpoint(endpoint: string) {
    const regex = /\{\s*(\w+)\s*\}/g;
    if (!regex.test(endpoint)) return endpoint;
    const cache = await this.loadCache();
    return endpoint.replace(regex, (_, key) => {
      const replacements = {
        athlete: cache.stravaAthlete,
      };
      if (key in replacements) return replacements[key];
      throw new Error(`Unknown interpolation ${JSON.stringify(key)}`);
    });
  }

  private async retryStravaAPI(
    endpoint: string,
    query: Record<string, string | number | undefined> = {},
  ): Promise<Response> {
    await this.getAccessTokenFromBrowser();
    return await this.rawStravaAPI(await this.interpolateEndpoint(endpoint), query);
  }

  async get<T>(endpoint: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    let data: Response;
    try {
      data = await this.rawStravaAPI(await this.interpolateEndpoint(endpoint), query);
      if (data.status === 401) {
        data = await this.retryStravaAPI(endpoint, query);
      }
    } catch (e) {
      // A refresh Strava refuses needs a login, as a missing session does
      const refused = e instanceof StravaError && (e.status === 400 || e.status === 401);
      if (e instanceof NeedsLogin || refused) {
        data = await this.retryStravaAPI(endpoint, query);
      } else throw e;
    }
    if (!data.ok) throw await StravaError.from(data);
    const json = await data.json();

    return json as T;
  }

  async getCalendar(): Promise<string | undefined> {
    try {
      const { stravaAthlete } = await this.loadCache();
      const user: UserCache = JSON.parse(await readFile(userCacheFile(stravaAthlete), 'utf-8'));
      return user.calendarSession;
    } catch {
      return undefined;
    }
  }
}
