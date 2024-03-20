import {
  type Activity,
  type Gear,
  type MapItem,
  type ResponseMessage,
  type Route,
  TimeRange,
} from '@strava-heatmapper/shared/interfaces';
import { computed, inject, provide, reactive, readonly, type Ref, ref } from 'vue';

import Socket from '@/socket';
import {
  appendCachedActivities,
  getActivityStore,
  getCachedActivities,
  getCachedGear,
  resetActivityStore,
  saveCachedGear,
} from '@/utils/storage';

import { type ActivityService, activityServiceToken, type LoadingStats } from './ActivityService';
import { useContinueLogin } from './useContinueLogin';

/** One day in milliseconds */
const DAY = 24 * 60 * 60 * 1000;

const MIN_TIMEZONE_ADJUSTMENT = 14 * 60 * 60 * 1000;
const MAX_TIMEZONE_ADJUSTMENT = -12 * 60 * 60 * 1000;

function makeActivityService(): ActivityService {
  const allRoutes = ref<Route[]>([]);
  const allActivities = ref<Activity[]>([]);

  const { continueLogin, waitForLogin } = useContinueLogin();

  const stats = ref<LoadingStats>({});

  const sportType = ref('');
  const useRoutes = ref(false);

  const error = ref<string>();

  let socketController = new AbortController();

  const allMapItems = computed<readonly MapItem[]>(() =>
    useRoutes.value ? allRoutes.value : allActivities.value,
  );

  const visibleMapItems = computed<readonly MapItem[]>(() =>
    sportType.value
      ? allMapItems.value.filter((item) => sportType.value.split(',').includes(item.type))
      : allMapItems.value,
  );

  /** A map of all gear, where null represents gear that is not yet fetched */
  const gear = reactive(new Map<string, Gear | null>());

  const clientStats = ref({
    inCache: true,
  });

  function addMapItems<T extends MapItem>(
    collection: Ref<readonly T[]>,
    newItems: readonly T[],
  ): void {
    const newIDs = new Set(newItems.map((item) => item.id));
    collection.value = collection.value
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
    if (stats.value.finding?.finished) {
      socket?.close();
    }
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
    addMapItems(allRoutes, filteredRoutes);
    checkFinished();
  }

  function receiveActivities(
    activities: Activity[],
    socket: Socket | undefined,
    start: Date | undefined,
    end: Date | undefined,
  ): void {
    const filteredActivities = filterActivities(activities, start, end);
    addMapItems(allActivities, filteredActivities);
    requestGear(
      filteredActivities.map(({ gear }) => gear),
      socket,
    );
    checkFinished();
  }

  function loadFromCache(partial = false, start?: Date | undefined, end?: Date | undefined): void {
    const activities = getCachedActivities();
    if (activities && activities.length) {
      if (!partial) {
        stats.value = { finding: { started: true, finished: true, length: activities.length } };
      }
      receiveActivities(activities, undefined, start, end);
    }
  }

  function cancelLoading() {
    socketController.abort();
    socketController = new AbortController();
  }

  function discardCache(clearStorage = false) {
    cancelLoading();
    clearMapItems(clearStorage);
  }

  function clearMapItems(clearStorage = false) {
    if (clearStorage) {
      localStorage.clear();
      stats.value = { cleared: true };
    }
    if (useRoutes.value) {
      allRoutes.value = [];
    } else {
      allActivities.value = [];
    }
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
    discardCache(false);

    if (partial) loadFromCache(partial, start, end);

    clientStats.value = {
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
          case 'gear': {
            gear.set(data.id, data.gear);
            saveCachedGear(data.id, data.gear);
            break;
          }
          case 'login': {
            waitForLogin(data.cookie, data.url);
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
      allActivities.value = [];
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
    }

    return await socket.completion();
  }

  async function load(start?: Date, end?: Date): Promise<void> {
    await sockets({ partial: useRoutes.value ? false : true, routes: useRoutes.value, start, end });
  }

  loadFromCache();

  return {
    continueLogin,
    stats: readonly(stats),
    clientStats: readonly(clientStats),
    sportType,
    useRoutes,
    error,
    gear: readonly(gear),

    mapItems: visibleMapItems,

    cancelLoading,
    discardCache,
    load,
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
