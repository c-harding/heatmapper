import { userCacheToUserInfo, type UserInfo } from '@strava-heatmapper/shared/interfaces';

import { type DetailedGear, type SummaryActivity, type SummaryRoute } from './model';
import RawStravaApi from './raw-api';

export class Strava {
  private rawApi: RawStravaApi;

  constructor(
    domain: string,
    requestToken: string | undefined,
    loginCallback: ((token: string, url: string) => Promise<boolean>) | null,
    abortSignal?: AbortSignal,
  ) {
    this.rawApi = new RawStravaApi(domain, requestToken, loginCallback, abortSignal);
  }

  private async getActivitiesPage(
    i: number,
    pageSize: number,
    start?: number,
    end?: number,
  ): Promise<SummaryActivity[]> {
    return this.rawApi.get('/athlete/activities', {
      per_page: pageSize,
      page: i,
      before: end === undefined ? undefined : Math.floor(end),
      after: start === undefined ? undefined : Math.floor(start),
    });
  }

  async getGearById(id: string): Promise<DetailedGear> {
    return await this.rawApi.get(`/gear/${id}`);
  }

  async getUserInfo(): Promise<UserInfo> {
    return userCacheToUserInfo(await this.rawApi.getUserCache());
  }

  async getUserId(): Promise<number> {
    return this.rawApi.getUserId();
  }

  /**
   * Fetches your data from the Strava API
   */
  async *getStravaActivitiesPages(start?: number, end?: number): AsyncGenerator<SummaryActivity[], void, undefined> {
    const pageSize = 200;
    let i = 1;
    while (true) {
      const page = await this.getActivitiesPage(i, pageSize, start, end);
      if (page.length) yield page;
      if (page.length < pageSize) break;
      i += 1;
    }
  }

  /**
   * Fetches your data from the Strava API
   */
  async *getStravaActivities(start?: number, end?: number): AsyncGenerator<SummaryActivity, void, undefined> {
    for await (const page of this.getStravaActivitiesPages(start, end)) {
      yield* page;
    }
  }

  private async getRoutesPage(i: number, pageSize: number): Promise<SummaryRoute[]> {
    return this.rawApi.get('/athletes/{athlete}/routes', {
      per_page: pageSize,
      page: i,
    });
  }

  /**
   * Fetches your data from the Strava API
   */
  public async *getStravaRoutesPages(): AsyncGenerator<SummaryRoute[], void, undefined> {
    const pageSize = 200;
    let i = 1;
    while (true) {
      const page = await this.getRoutesPage(i, pageSize);
      console.log('route page', i, 'has length', page.length);
      if (page.length) yield page;
      if (page.length < pageSize) break;
      i += 1;
    }
  }

  /**
   * Fetches your data from the Strava API
   */
  async *getStravaRoutes(): AsyncGenerator<unknown, void, undefined> {
    for await (const page of this.getStravaRoutesPages()) {
      yield* page;
    }
  }

  async getActivity(id: number | string): Promise<SummaryActivity> {
    return await this.rawApi.get(`/activities/${id}`);
  }

  async logout(global?: boolean);
  async logout(global: true, athlete: number);
  async logout(global = false, athlete?: number) {
    if (global) {
      await this.rawApi.logoutGlobal(athlete);
    } else {
      await this.rawApi.logout();
    }
  }
}
