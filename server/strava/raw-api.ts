import '@strava-heatmapper/shared/config/dotenv';

import { type UserCache } from '@strava-heatmapper/shared/interfaces';
import { readFile } from 'fs/promises';
import fetch, { type Response } from 'node-fetch';
import { v4 as uuid, validate as validateUUID } from 'uuid';

import LoginError, { CannotLogin, NeedsLogin } from '../login-error';
import { deleteFile, updateFile } from './file';
import { type SummaryAthlete } from './model';
import { addCallback } from './token';

const { STRAVA_CLIENT_ID: stravaClientId, STRAVA_CLIENT_SECRET: stravaClientSecret } = process.env;

const SESSIONS_DIR = 'sessions';
const sessionCacheFile = (token: string) => `${SESSIONS_DIR}/${token}.json`;
const userCacheFile = (userId: number) => `${SESSIONS_DIR}/user-${userId}.json`;

interface Cache {
  stravaRefreshToken: string;
  stravaAthlete: number;
  stravaAccessToken?: string;
  stravaExpiry?: number;
  stravaScope?: string[];
}

export default class RawStravaApi {
  private readonly token: string;

  constructor(
    private readonly domain: string,
    requestToken: string | undefined,
    private readonly loginCallback: ((token: string, url: string) => Promise<boolean>) | null,
    private readonly abortSignal?: AbortSignal,
  ) {
    this.token = requestToken && validateUUID(requestToken) ? requestToken : uuid();
  }

  private async loadCache(): Promise<Cache> {
    try {
      const jsonStr = await readFile(sessionCacheFile(this.token), 'utf-8');
      const cache: Cache = JSON.parse(jsonStr);
      if (!cache.stravaAthlete || !cache.stravaRefreshToken) {
        throw new NeedsLogin('Loaded from cache, but athlete or refresh token is missing');
      }
      const currentEpochSeconds = Date.now() / 1e3;
      if (cache.stravaExpiry && cache.stravaExpiry < currentEpochSeconds) {
        delete cache.stravaAccessToken;
      }
      return cache;
    } catch (e) {
      throw new NeedsLogin('Could not load from cache', { cause: e });
    }
  }

  /**
   * Updates cached strava authentication tokens if necessary
   */
  private async getStravaToken(): Promise<string>;
  private async getStravaToken(scope: string, authCode: string): Promise<string>;
  private async getStravaToken(scope?: string, authCode?: string): Promise<string> {
    let calculatedParams: { refresh_token: string } | { code: string; grant_type: string };

    if (authCode) calculatedParams = { grant_type: 'authorization_code', code: authCode };
    else {
      const cache = await this.loadCache();
      if (cache.stravaAccessToken) return cache.stravaAccessToken;

      calculatedParams = {
        refresh_token: cache.stravaRefreshToken,
      };
    }

    // get new tokens
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'post',
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: stravaClientId,
        client_secret: stravaClientSecret,
        ...calculatedParams,
      }),
      headers: { 'Content-Type': 'application/json' },
      signal: this.abortSignal,
    });
    if (res.status >= 400 && authCode) {
      console.error('/token:', res.status, 'body:', await res.json());
      // TODO: why such a hard exit?
      process.exit(1);
    }
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
          this.athleteToUser(athlete, oldUser.sessions),
        ),
    ]);

    return data.access_token;
  }

  async getUserId(): Promise<number> {
    let cache: Cache;
    try {
      cache = await this.loadCache();
    } catch {
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
      this.athleteToUser(athlete, oldUser.sessions),
    );
  }

  private athleteToUser(athlete: SummaryAthlete, existingSessions?: string[]) {
    return {
      id: athlete.id,
      firstName: athlete.firstname,
      lastName: athlete.lastname,
      image62: athlete.profile_medium,
      image124: athlete.profile,
      sessions: Array.from(new Set<string>(existingSessions).add(this.token)),
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
    const API_BASE = 'https://www.strava.com/api/v3';
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
    console.trace('getAccessTokenFromBrowser');
    if (!this.loginCallback) throw new CannotLogin('requestLogin is null');
    const athleteInfoPromise = addCallback(this.token, { signal: this.abortSignal }, (oauthResponse) => {
      return this.getStravaToken(oauthResponse.scope, oauthResponse.code);
    });

    const redirectUrl = `${this.domain}/api/token`;
    const scope = ['read_all', 'activity:read', 'activity:read_all'].join(',');
    const continueAfterLogin = await this.loginCallback(
      this.token,
      `http://www.strava.com/oauth/authorize?client_id=${stravaClientId}&response_type=code&redirect_uri=${redirectUrl}&state=${this.token}&approval_prompt=auto&scope=${scope}`,
    );

    try {
      await athleteInfoPromise;

      // If we do not continue after login, return a never-resolving promise.
      // This prevents the subsequent request from completing.
      if (!continueAfterLogin) await new Promise(() => undefined);
    } catch {
      if (continueAfterLogin) {
        await this.getAccessTokenFromBrowser();
      }
    }
  }

  async logoutGlobal(athlete?: number) {
    try {
      const atheleteId = athlete || (await this.loadCache()).stravaAthlete;
      const user = await deleteFile<UserCache>(userCacheFile(atheleteId), true);
      const sessions = new Set(user?.sessions).add(this.token);

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

        if (user.sessions.length > 0) {
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
      if (e instanceof NeedsLogin) {
        data = await this.retryStravaAPI(endpoint, query);
      } else throw e;
    }
    const json = await data.json();

    return json as T;
  }
}
