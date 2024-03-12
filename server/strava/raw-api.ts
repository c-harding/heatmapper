import '@strava-heatmapper/shared/config/dotenv';

import { readFile } from 'fs/promises';
import type { Response } from 'node-fetch';
import fetch from 'node-fetch';
import { v4 as uuid, validate as validateUUID } from 'uuid';

import NeedsLogin from '../needs-login';
import { updateFile } from './file';
import { addCallback } from './token';

console.log('INITIALISING RAW_API');

const { STRAVA_CLIENT_ID: stravaClientId, STRAVA_CLIENT_SECRET: stravaClientSecret } = process.env;

const SESSIONS_DIR = 'sessions';
const sessionCacheFile = (token: string) => `${SESSIONS_DIR}/${token}.json`;

interface Cache {
  stravaRefreshToken?: string;
  stravaAthlete?: number;
  stravaAccessToken?: string;
  stravaExpiry?: number;
}

export default class RawStravaApi {
  private readonly token: string;

  constructor(
    private readonly domain: string,
    tokenCookie: string | undefined,
    private readonly requestLogin: (token: string, url: string) => Promise<void>,
  ) {
    this.token = tokenCookie && validateUUID(tokenCookie) ? tokenCookie : uuid();
  }

  private async loadCache(): Promise<Cache> {
    try {
      const jsonStr = await readFile(sessionCacheFile(this.token), 'utf-8');
      const cache: Cache = JSON.parse(jsonStr);
      if (!cache.stravaAthlete) throw new NeedsLogin();
      const currentEpochSeconds = Date.now() / 1e3;
      if (cache.stravaExpiry && cache.stravaExpiry < currentEpochSeconds) {
        delete cache.stravaAccessToken;
      }
      return cache;
    } catch (error) {
      return {};
    }
  }

  /**
   * Updates cached strava authentication tokens if necessary
   */
  private async getStravaToken(params?: { code: string | string[]; grant_type: string }): Promise<string> {
    let calculatedParams: { refresh_token: string } | { code: string | string[]; grant_type: string };
    if (params) calculatedParams = params;
    else {
      const cache = await this.loadCache();
      if (cache.stravaAccessToken) return cache.stravaAccessToken;
      if (!cache.stravaRefreshToken) throw new NeedsLogin();

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
    });
    if (res.status >= 400 && params) {
      console.error('/token:', res.status, 'body:', await res.json());
      process.exit(1);
    }
    const data = (await res.json()) as {
      expires_at: number;
      refresh_token: string;
      access_token: string;
      athlete?: { id: number };
    };

    const stravaAthlete = data.athlete?.id;

    const cache = await updateFile(sessionCacheFile(this.token), { stravaAthlete }, (oldCache: Cache) => ({
      ...oldCache,
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
      stravaExpiry: data.expires_at,
    }));

    console.debug(`ref: ${data.refresh_token?.substring(0, 6)}`);

    return cache.stravaAccessToken;
  }

  private async rawStravaAPI(endpoint: string, query: Record<string, string | number | undefined> = {}) {
    const API_BASE = 'https://www.strava.com/api/v3';
    const queryString = (Object.entries(query).filter(([, value]) => value) as [string, string | number][])
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const API = `${API_BASE}${endpoint}?${queryString}`;

    const data = await fetch(API, {
      headers: { Authorization: `Bearer ${await this.getStravaToken()}` },
    });
    return data;
  }

  private async getAccessTokenFromBrowser(): Promise<void> {
    const athleteInfoPromise = addCallback(this.token);

    console.log(`Generating login link for ${this.token}`);
    await this.requestLogin(
      this.token,
      `https://www.strava.com/oauth/authorize?client_id=${stravaClientId}&response_type=code&redirect_uri=${this.domain}/api/token&state=${this.token}&approval_prompt=auto&scope=read_all,activity:read_all`,
    );

    await athleteInfoPromise.then(
      (oauthResponse) => {
        return this.getStravaToken({
          code: oauthResponse.code,
          grant_type: 'authorization_code',
        });
      },
      () => this.getAccessTokenFromBrowser(),
    );
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
