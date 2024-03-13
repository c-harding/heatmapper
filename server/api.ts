import {
  type Activity,
  type ActivityMap,
  type Gear,
  type RequestMessage,
  type ResponseMessage,
  type Route,
  type StatsMessage,
  TimeRange,
} from '@strava-heatmapper/shared/interfaces';
import express from 'express';
import { type Router } from 'express-ws';
import { createReadStream } from 'fs';

import eagerIterator from './eager-iterator';
import { completeInOrder } from './stateful-functions';
import { Strava } from './strava';
import { type DetailedGear, type SummaryActivity, type SummaryRoute } from './strava/model';
import { tokenExchange, validTokenCallback } from './strava/token';

const VERSION = 2;

async function* chunkAsync<T>(array: Promise<T>[], n = 10): AsyncGenerator<T[]> {
  for (let i = 0; i < array.length; i += n) {
    yield Promise.all(array.slice(i, i + n));
  }
}

function defined(...dependencies: unknown[]): true | undefined {
  return dependencies.every((dependency) => dependency !== undefined) ? true : undefined;
}

function convertActivitySummary({
  id,
  name,
  start_date: startDate,
  start_date_local: localStartDate,
  map: { summary_polyline: map },
  sport_type,
  distance,
  gear_id: gear,
  moving_time: movingTime,
  elapsed_time: duration,
  total_elevation_gain,
  elev_high,
  elev_low,
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
    distance,
    type: sport_type,
    gear,
    elevation: defined(total_elevation_gain, elev_high, elev_low) && {
      max: elev_high,
      min: elev_low,
      gain: total_elevation_gain,
      // TODO: this is wrong. Should be (total_elevation_gain + elev_end - elev_start)
      loss: total_elevation_gain + elev_low - elev_high,
    },
  };
}

const routeTypeMap = { 1: 'Ride', 2: 'Run', 3: 'Walk' } as const;
const routeSubTypeMap = { 1: 'Road', 2: 'MountainBike', 3: 'Cross', 4: 'Trail', 5: 'Mixed' } as const;

function convertRouteSummary({
  id_str: id,
  name,
  created_at: date,
  map: { summary_polyline: map },
  type,
  sub_type: subType,
  starred,
  distance,
  elevation_gain,
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
    type: routeTypeMap[type],
    subType: routeSubTypeMap[subType],
  };
}

function convertGear({
  name,
  description,
  distance,
  primary,
  brand_name: brand,
  model_name: model,
}: DetailedGear): Gear {
  return { name, description, distance, primary, brand, model };
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

export default function apiRouter(domain: string): express.Router {
  const router = express.Router() as Router;

  router.ws('/activities', (ws, req) => {
    let live = true;

    function send(data: ResponseMessage) {
      if (live) ws.send(JSON.stringify(data));
    }

    const fetchedMaps = new Map<string, string>();

    async function requestLogin(token: string, url: string) {
      send({ type: 'login', cookie: token, url });
      return true;
    }

    const strava = new Strava(domain, req.cookies.token, requestLogin);

    const stats: StatsMessage = {
      type: 'stats',
      finding: { started: false, finished: false, length: 0 },
    };
    const sendStats = () => send(stats);
    const sendGear = (gear: DetailedGear) =>
      send({
        type: 'gear',
        id: gear.id,
        gear: convertGear(gear),
      });

    ws.on('close', () => {
      live = false;
    });

    // TODO: cache this sensibly
    /**
     * Fetches your data from the Strava API
     */
    async function* activitiesIterator(start?: number, end?: number): AsyncGenerator<Activity[]> {
      for await (const page of eagerIterator(strava.getStravaActivitiesPages(start, end))) {
        if (!live) return;

        stats.finding.length += page.length;
        sendStats();

        const newActivities = page
          .map((activity) => convertActivitySummary(activity))
          .filter((activity) => activity.map);
        if (newActivities.length) {
          yield newActivities;
        }
      }
    }

    /**
     * Fetches your routes from the Strava API
     */
    async function* routesIterator(): AsyncGenerator<Route[]> {
      const routes: Route[] = [];

      for await (const page of eagerIterator(strava.getStravaRoutesPages())) {
        if (!live) return;

        stats.finding.length = routes.length + page.length;
        sendStats();

        const newRoutes = page.map((route) => convertRouteSummary(route)).filter((route) => route.map);
        routes.push(...newRoutes);
        yield newRoutes;
      }
    }

    const sendMaps = completeInOrder(async (activities: string[]) => {
      const activityMaps = sortPromises(
        activities.map(async (id) => {
          const highDetail = false;
          let map = fetchedMaps.get(id);
          if (map) fetchedMaps.delete(id);
          if (map && !highDetail) return [id, map];
          map = convertActivity(await strava.getActivity(id), highDetail).map;
          return [id, map];
        }),
      );
      // mutex section
      return async () => {
        for await (const chunk of chunkAsync(activityMaps, 50)) {
          if (!live) return;
          const maps = Object.fromEntries(chunk);
          send({ type: 'maps', chunk: maps } as ResponseMessage);
        }
        sendStats();
      };
    });

    ws.on('message', async (data) => {
      const message: RequestMessage = JSON.parse(data.toString());
      if (message.version) {
        send({ type: 'version', version: VERSION });
      }

      if (message.activities) {
        stats.finding.started = true;

        for (const { start, end } of TimeRange.cap(message.activities).reverse()) {
          sendStats();
          // TODO: add error handling (offline)
          for await (const activities of activitiesIterator(start, end)) {
            if (!live) return;
            activities.forEach(({ map, id }) => {
              fetchedMaps.set(id.toString(), map);
            });
            send({
              type: 'activities',
              activities: activities.map(({ map, ...activity }) => activity),
            } as ResponseMessage);
            sendStats();
          }

          if (!live) return;
          sendStats();
        }

        if (!live) return;
        stats.finding.finished = true;
        sendStats();
      }

      if (message.routes) {
        stats.finding.started = true;

        sendStats();
        for await (const routes of routesIterator()) {
          if (!live) return;
          routes.forEach(({ map, id }) => {
            fetchedMaps.set(id, map);
          });
          send({
            type: 'routes',
            routes: routes.map(({ map, ...routes }) => routes),
          } as ResponseMessage);
          sendStats();
        }

        if (!live) return;
        stats.finding.finished = true;
        sendStats();
      }

      if (message.maps) {
        sendMaps(message.maps);
      }

      if (message.gear) {
        sendGear(await strava.getGearById(message.gear));
      }
    });
  });

  router.get('/token', async (req, res) => {
    let code: number, html: string;
    try {
      const successful = validTokenCallback(req.query) && (await tokenExchange(req.query));
      [code, html] = successful ? [200, 'static/auth.html'] : [400, 'static/auth-error.html'];
    } catch (e) {
      [code, html] = [500, 'static/auth-error.html'];
    }
    res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' });
    createReadStream(html).pipe(res);
  });

  router.get('/user', async (req, res) => {
    async function requestLogin(token: string, url: string) {
      res.status(403).cookie('token', token, { maxAge: 31536000 }).header('location', url).send({ token });
      return false;
    }

    const stravaApi = new Strava(domain, req.cookies.token, requestLogin);
    try {
      const athlete = await stravaApi.getUserInfo();
      res.send(athlete);
    } catch (e) {
      if (e) console.error('Got error fetching the user info:', e);
      res.status(500).send({ type: 'Internal Server Error', error: e });
    }
  });

  router.delete('/user', async (req, res) => {
    const global = 'global' in req.query;

    const stravaApi = new Strava(domain, req.cookies.token, null);
    try {
      await stravaApi.logout(global);
      res.status(204).send();
    } catch (e) {
      console.error('Got error logging out:', e);
      res.status(500).send({ type: 'Internal Server Error', error: e });
    }
  });

  return router;
}
