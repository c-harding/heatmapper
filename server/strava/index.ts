import { type DetailedGear, type SummaryActivity, type SummaryRoute } from './model';
import RawStravaApi from './raw-api';

export class Strava {
  private rawApi: RawStravaApi;

  constructor(
    domain: string,
    tokenCookie: string | undefined,
    requestLogin: (token: string, url: string) => Promise<void>,
  ) {
    this.rawApi = new RawStravaApi(domain, tokenCookie, requestLogin);
  }

  private async getActivitiesPage(i: number, start?: number, end?: number): Promise<SummaryActivity[]> {
    return this.rawApi.get('/athlete/activities', {
      per_page: 200,
      page: i,
      before: end === undefined ? undefined : Math.floor(end),
      after: start === undefined ? undefined : Math.floor(start),
    });
  }

  async getGearById(id: string): Promise<DetailedGear> {
    return await this.rawApi.get(`/gear/${id}`);
  }

  /**
   * Fetches your data from the Strava API
   */
  async *getStravaActivitiesPages(start?: number, end?: number): AsyncGenerator<SummaryActivity[], void, undefined> {
    let i = 1;
    while (true) {
      const page = await this.getActivitiesPage(i, start, end);
      if (!page.length) break;
      yield page;
      i += 1;
    }
  }

  /**
   * Fetches your data from the Strava API
   */
  async *getStravaActivities(start?: number, end?: number): AsyncGenerator<unknown, void, undefined> {
    for await (const page of this.getStravaActivitiesPages(start, end)) {
      yield* page;
    }
  }

  private async getRoutesPage(i: number): Promise<SummaryRoute[]> {
    return this.rawApi.get('/athletes/{athlete}/routes', {
      per_page: 200,
      page: i,
    });
  }

  /**
   * Fetches your data from the Strava API
   */
  public async *getStravaRoutesPages(): AsyncGenerator<SummaryRoute[], void, undefined> {
    let i = 1;
    while (true) {
      const page = await this.getRoutesPage(i);
      console.log('route page', i, 'has length', page.length);
      if (!page.length) break;
      yield page;
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
}
