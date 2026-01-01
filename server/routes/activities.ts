import {
  type Activity,
  type ActivityMap,
  type Gear,
  type RequestMessage,
  type ResponseMessage,
  type Route,
  routeTypeMap,
  type StatsMessage,
  TimeRange,
} from '@strava-heatmapper/shared/interfaces';
import { type WebsocketRequestHandler } from 'express-ws';
import { AbortError } from 'node-fetch';

import eagerIterator from '../eager-iterator';
import { extractRequestToken } from '../request-utils';
import { Strava } from '../strava';
import { type DetailedGear, type SummaryActivity, type SummaryRoute } from '../strava/model';

async function* chunkAsync<T>(array: Promise<T>[], n = 10): AsyncGenerator<T[]> {
  for (let i = 0; i < array.length; i += n) {
    yield Promise.all(array.slice(i, i + n));
  }
}

function allDefined(...dependencies: unknown[]): true | undefined {
  return dependencies.every((dependency) => dependency !== undefined) ? true : undefined;
}

function convertActivitySummary({
  id,
  name,
  start_date: startDate,
  start_date_local: localStartDate,
  map: { summary_polyline: map },
  device_name,
  sport_type,
  distance,
  gear_id: gear,
  moving_time: movingTime,
  elapsed_time: duration,
  total_elevation_gain,
  elev_high,
  elev_low,
  private: isPrivate,
}: SummaryActivity): Activity {
  const date = +new Date(startDate);
  const localDate = +new Date(localStartDate);
  return {
    route: false,
    id: String(id),
    name,
    date,
    localDate,
    movingTime,
    end: date + duration * 1000,
    localEnd: localDate + duration * 1000,
    map,
    device: device_name,
    distance,
    type: sport_type,
    gear,
    isPrivate,
    elevation: allDefined(total_elevation_gain, elev_high, elev_low) && {
      max: elev_high,
      min: elev_low,
      gain: total_elevation_gain,
      // TODO: this is wrong. Should be (total_elevation_gain + elev_end - elev_start)
      loss: total_elevation_gain + elev_low - elev_high,
    },
  };
}

function convertRouteSummary({
  id_str: id,
  name,
  created_at: date,
  map: { summary_polyline: map },
  type,
  starred,
  distance,
  elevation_gain,
  private: isPrivate,
}: SummaryRoute): Route {
  return {
    route: true,
    id,
    name,
    date: +new Date(date),
    distance,
    elevation: { gain: elevation_gain },
    map,
    starred,
    type: routeTypeMap[type] ?? type,
    isPrivate,
  };
}

function convertGear({
  name,
  description,
  distance,
  primary,
  brand_name: brand,
  model_name: model,
  frame_type: frameType,
}: DetailedGear): Gear {
  return { name, description, distance, primary, brand, model, isBike: frameType !== undefined };
}

function convertActivity({ id, map }, highDetail = false): ActivityMap {
  try {
    return { id, map: highDetail ? map.polyline : map.summary_polyline };
  } catch (e) {
    if (!map) {
      console.error('No map for activity', id);
      return { id, map: '' };
    }
    throw e;
  }
}

/**
 * Sort promises by execution time, instantly.
 *
 * This takes the number of promises provided, and creates an equal number of promises in return.
 * The first promise in this returned array will resolve with the result of the first promise to resolve in the source
 * array, and so on.
 */
function sortPromises<T>(promises: Promise<T>[]): Promise<T>[] {
  const sorted: Promise<T>[] = [];
  const handlers: { resolve: (value: T | PromiseLike<T>) => void; reject: (reason?: unknown) => void }[] = [];
  let done = 0;
  promises.forEach((promise) => {
    sorted.push(new Promise((resolve, reject) => handlers.push({ resolve, reject })));
    promise.then(
      (value) => handlers[done++].resolve(value),
      (value) => handlers[done++].reject(value),
    );
  });
  return sorted;
}

export class ActivitiesHandler {
  constructor(
    readonly domain: string,
    readonly modelVersion: number,
  ) {}

  readonly get: WebsocketRequestHandler = (ws, req) => {
    const abortController = new AbortController();
    const isLive = () => !abortController.signal.aborted;

    function send(data: ResponseMessage) {
      if (isLive()) ws.send(JSON.stringify(data));
    }

    async function requestLogin(token: string, url: string) {
      send({ type: 'login', cookie: token, url });
      return true;
    }

    const strava = new Strava(this.domain, extractRequestToken(req), requestLogin, abortController.signal);

    const sendGear = (gear: DetailedGear) =>
      send({
        type: 'gear',
        id: gear.id,
        gear: convertGear(gear),
      });

    ws.on('close', (code, reason) => {
      abortController.abort([code, reason.toString('utf-8')].join(' '));
    });

    /**
     * Fetches your data from the Strava API
     */
    async function* activitiesIterator(start?: number, end?: number): AsyncGenerator<Activity[]> {
      for await (const page of eagerIterator(strava.getStravaActivitiesPages(start, end))) {
        yield page.map((activity) => convertActivitySummary(activity));
      }
    }

    /**
     * Fetches your routes from the Strava API
     */
    async function* routesIterator(): AsyncGenerator<Route[]> {
      for await (const page of eagerIterator(strava.getStravaRoutesPages())) {
        yield page.map((route) => convertRouteSummary(route)).filter((route) => route.map);
      }
    }

    const handleHandshake = async () => {
      send({
        type: 'handshake',
        version: this.modelVersion,
        user: await strava.getUserId(),
      });
    };

    const handleActivities = async (activities: TimeRange[]) => {
      const stats: StatsMessage = {
        type: 'stats',
        for: 'activities',
        finding: { started: false, finished: false, length: 0 },
      };

      stats.finding.started = true;

      for (const { start, end } of TimeRange.cap(activities).reverse()) {
        send(stats);
        // TODO: add error handling (offline)
        for await (const activities of activitiesIterator(start, end)) {
          stats.finding.length += activities.length;

          if (!isLive()) return;
          send({
            type: 'activities',
            activities: activities.filter((activity) => activity.map),
          });
          send(stats);
        }
      }

      if (!isLive()) return;
      stats.finding.finished = true;
      send(stats);
    };

    const handleRoutes = async () => {
      const stats: StatsMessage = {
        type: 'stats',
        for: 'routes',
        finding: { started: false, finished: false, length: 0 },
      };

      stats.finding.started = true;

      send(stats);
      for await (const routes of routesIterator()) {
        stats.finding.length += routes.length;
        if (!isLive()) return;

        send({
          type: 'routes',
          routes,
        });
        send(stats);
      }

      if (!isLive()) return;
      stats.finding.finished = true;
      send(stats);
    };

    const handleGear = async (gear: string) => {
      sendGear(await strava.getGearById(gear));
    };

    ws.on('message', async (data) => {
      try {
        const message: RequestMessage = JSON.parse(data.toString());
        await Promise.all([
          message.handshake && handleHandshake(),
          message.activities && handleActivities(message.activities),
          message.routes && handleRoutes(),
          message.gear && handleGear(message.gear),
        ]);
      } catch (e: unknown) {
        if (e instanceof AbortError) {
          console.info('Request aborted');
        } else {
          console.trace('Encountered error:', e);
        }
      }
    });
  };
}
