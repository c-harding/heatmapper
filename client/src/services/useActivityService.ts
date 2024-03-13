import {
  type Activity,
  type Gear,
  type MapItem,
  type ResponseMessage,
  type Route,
  TimeRange,
} from '@strava-heatmapper/shared/interfaces';
import { computed, inject, provide, reactive, readonly, ref } from 'vue';

import Socket from '@/socket';
import {
  appendCachedActivities,
  getActivityStore,
  getCachedActivities,
  getCachedGear,
  getCachedMap,
  getCachedMaps,
  resetActivityStore,
  saveCachedGear,
  saveCachedMaps,
} from '@/utils/storage';

import { type ActivityService, activityServiceToken, type LoadingStats } from './ActivityService';

/** One day in milliseconds */
const DAY = 24 * 60 * 60 * 1000;

const MIN_TIMEZONE_ADJUSTMENT = 14 * 60 * 60 * 1000;
const MAX_TIMEZONE_ADJUSTMENT = -12 * 60 * 60 * 1000;

function makeActivityService(): ActivityService {
  const allMapItems = ref<MapItem[]>([]);

  const continueLogin = ref<((withCookies: boolean) => void) | null>(null);

  const stats = ref<LoadingStats>({});

  const sportType = ref('');

  const error = ref<string>();

  let socketController = new AbortController();

  const visibleMapItems = computed<readonly MapItem[]>(() =>
    sportType.value
      ? allMapItems.value.filter((item) => sportType.value.split(',').includes(item.type))
      : allMapItems.value,
  );

  /** A map of all gear, where null represents gear that is not yet fetched */
  const gear = reactive(new Map<string, Gear | null>());

  const clientStats = ref({
    mapsRequested: 0,
    mapsLoaded: 0,
    mapsNotCached: 0,
    inCache: true,
  });

  function receiveMaps(maps: Record<string, string>): void {
    clientStats.value.mapsLoaded += Object.keys(maps).length;

    Object.entries(maps).forEach(([item, map]) => {
      const i = allMapItems.value.findIndex(({ id }) => id.toString() === item);
      if (i > -1) {
        allMapItems.value[i].map = map;
      }
    });

    // Trigger change detection for mapItems
    allMapItems.value = allMapItems.value.slice();
  }

  function addMapItems(newItems: readonly MapItem[]): void {
    const newIDs = new Set(newItems.map((item) => item.id));
    allMapItems.value = allMapItems.value
      .filter((item) => !newIDs.has(item.id))
      .concat(newItems)
      .sort((a, b) => b.date - a.date);
  }

  function filterActivities<T extends MapItem>(mapItems: T[], start?: Date, end?: Date): T[] {
    return mapItems.filter(
      (item) => (!start || item.date >= +start) && (!end || item.date <= +end + DAY),
    );
  }

  function checkFinished(socket?: Socket): void {
    if (
      clientStats.value.mapsRequested === clientStats.value.mapsLoaded &&
      stats.value.finding?.finished
    ) {
      socket?.close();
    }
  }

  async function requestMaps(ids: string[], socket?: Socket) {
    clientStats.value.mapsRequested += ids.length;
    const { cached, notCached } = getCachedMaps(ids);
    receiveMaps(cached);
    if (socket && notCached.length) {
      await socket.sendRequest({
        maps: notCached,
      });
    }
    checkFinished(socket);
  }

  function requestGear(ids: (string | undefined)[], socket?: Socket) {
    const validIds = ids.filter((id?: string): id is string => !!id);

    for (const gearId of validIds) {
      if (gear.has(gearId)) continue;
      if (socket) {
        gear.set(gearId, null);
        void socket.sendRequest({
          gear: gearId,
        });
      } else {
        gear.set(gearId, getCachedGear(gearId) ?? null);
      }
    }
  }

  async function startLoading(socket: Socket, ranges: TimeRange[]) {
    await socket.sendRequest({
      activities: ranges,
    });
  }

  async function startLoadingRoutes(socket: Socket) {
    await socket.sendRequest({
      routes: true,
    });
  }

  function receiveRoutes(routes: Route[], socket: Socket, start?: Date, end?: Date): void {
    const filteredRoutes = filterActivities(routes, start, end);
    addMapItems(filteredRoutes);
    requestMaps(
      filteredRoutes.map(({ id }) => id),
      socket,
    );
  }

  function receiveActivities(
    activities: Activity[],
    socket: Socket | undefined,
    start: Date | undefined,
    end: Date | undefined,
  ): void {
    const filteredActivities = filterActivities(activities, start, end);
    addMapItems(filteredActivities);
    requestGear(
      filteredActivities.map(({ gear }) => gear),
      socket,
    );
    requestMaps(
      filteredActivities.map(({ id }) => id),
      socket,
    );
  }

  function loadFromCache(partial = false, start?: Date | undefined, end?: Date | undefined): void {
    const activities = getCachedActivities();
    if (activities && activities.length) {
      if (!partial) {
        stats.value = { finding: { started: true, finished: true, length: activities.length } };
      }
      const cachedActivities = activities.filter(({ id }) => getCachedMap(id));
      clientStats.value.mapsNotCached = activities.length - cachedActivities.length;
      receiveActivities(cachedActivities, undefined, start, end);
    }
  }

  function discardCache() {
    socketController.abort();
    resetData();
    socketController = new AbortController();
  }

  function resetData() {
    localStorage.clear();
    stats.value = { cleared: true };
    allMapItems.value = [];
  }

  interface SocketOptions {
    partial?: boolean;
    routes?: boolean;
    start?: Date;
    end?: Date;
  }

  async function sockets({
    partial = false,
    routes = false,
    start,
    end,
  }: SocketOptions = {}): Promise<void> {
    discardCache();

    if (partial) loadFromCache(partial, start, end);
    clientStats.value = {
      mapsRequested: 0,
      mapsLoaded: 0,
      mapsNotCached: 0,
      inCache: false,
    };
    stats.value = {};
    error.value = undefined;

    // The dates shown in the UI are formatted in event-local time.
    // In order to ensure that all events are correctly shown, we need to ensure that the start
    // timestamp represents the earliest point that this date is reached anywhere on Earth, and that
    // the end timestamp represents the latest point that this date ends anywhere on Earth.
    // Note that the dates are then filtered in the frontend to ensure that only those which were
    // started on the correct day according to activity-local time are shown.
    const startTimestamp = start ? (start.getTime() - MIN_TIMEZONE_ADJUSTMENT) / 1000 : 0;
    const endTimestamp = end
      ? (end.getTime() + DAY - MAX_TIMEZONE_ADJUSTMENT) / 1000
      : Date.now() / 1000;

    let latestActivityDate = startTimestamp;

    const protocol = window.location.protocol.includes('https') ? 'wss' : 'ws';
    const socket = new Socket(
      `${protocol}://${window.location.host}/api/activities`,
      (data: ResponseMessage) => {
        switch (data.type) {
          case 'stats': {
            const oldStats = stats.value;
            stats.value = data;
            if (!oldStats?.finding?.finished && data.finding.finished) {
              appendCachedActivities([], latestActivityDate, startTimestamp);
            }
            break;
          }
          case 'activities': {
            const activityCount = data.activities.length;
            if (activityCount === 0) break;
            receiveActivities(data.activities, socket, start, end);

            // API returns roughly in descending order
            const latestDate = new Date(data.activities[0].date).getTime() / 1000;
            const earliestDate = new Date(data.activities[activityCount - 1].date).getTime() / 1000;
            latestActivityDate = Math.max(latestActivityDate, latestDate);
            appendCachedActivities(data.activities, latestDate, earliestDate);
            break;
          }
          case 'routes': {
            const routeCount = data.routes.length;
            if (routeCount === 0) break;
            receiveRoutes(data.routes, socket, start, end);
            break;
          }
          case 'maps': {
            saveCachedMaps(data.chunk);
            receiveMaps(data.chunk);
            break;
          }
          case 'gear': {
            gear.set(data.id, data.gear);
            saveCachedGear(data.id, data.gear);
            break;
          }
          case 'login': {
            continueLogin.value = (cookies = true) => {
              if (cookies) document.cookie = `token=${data.cookie};max-age=31536000`;
              continueLogin.value = null;
              window.open(data.url, 'menubar=false,toolbar=false,width=300, height=300');
            };
            break;
          }
          default:
            console.warn(`Unknown message ${data}`);
        }
        checkFinished(socket);
      },
      (errored) => {
        if (errored) {
          error.value = 'Error fetching activities';
        } else {
          stats.value.status = 'disconnected';
        }
      },
      socketController,
    );

    const { version: serverVersion } = await socket.sendRequest({ version: true }, 'version');

    const storeVersion = getActivityStore().version;
    if (storeVersion !== serverVersion) {
      allMapItems.value = [];
      resetActivityStore(serverVersion);
    }

    if (routes) {
      // TODO: send ranges
      startLoadingRoutes(socket);
    } else {
      let ranges: TimeRange[];
      const { covered, activities } = getActivityStore();
      if (partial) {
        ranges = TimeRange.cap(TimeRange.invert(covered), startTimestamp ?? 0, endTimestamp);
        receiveActivities(activities, socket, start, end);
      } else {
        ranges = [{ start: startTimestamp, end: endTimestamp }];
      }

      startLoading(socket, ranges);

      return await socket.completion();
    }
  }

  async function loadPartial(start?: Date, end?: Date): Promise<void> {
    await sockets({ partial: true, start, end });
  }

  async function loadRoutes(start?: Date, end?: Date): Promise<void> {
    await sockets({ routes: true, start, end });
  }

  loadFromCache();

  return {
    continueLogin,
    stats: readonly(stats),
    clientStats: readonly(clientStats),
    sportType,
    error,
    gear: readonly(gear),

    mapItems: visibleMapItems,

    discardCache,
    loadPartial,
    loadRoutes,
  };
}

function provideActivityService() {
  const service = makeActivityService();
  provide(activityServiceToken, service);
  return service;
}

export function useActivityService() {
  return inject(activityServiceToken, provideActivityService, true);
}
