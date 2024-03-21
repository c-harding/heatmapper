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
  appendCachedRoutes,
  clearCachedActivities,
  clearCachedRoutes,
  getActivityStore,
  getCachedActivities,
  getCachedGear,
  getCachedRoutes,
  resetStore,
  saveCachedGear,
} from '@/utils/storage';

import {
  type ActivityService,
  activityServiceToken,
  type FilterModel,
  type LoadingStats,
} from './ActivityService';
import { useContinueLogin } from './useContinueLogin';

/** One day in milliseconds */
const DAY = 24 * 60 * 60 * 1000;

const MIN_TIMEZONE_ADJUSTMENT = 14 * 60 * 60 * 1000;
const MAX_TIMEZONE_ADJUSTMENT = -12 * 60 * 60 * 1000;

function makeActivityService(): ActivityService {
  const allRoutes = ref<Route[]>([]);
  const allActivities = ref<Activity[]>([]);

  const { continueLogin, waitForLogin } = useContinueLogin();

  const routeStats = ref<LoadingStats>({ inCache: false });
  const activityStats = ref<LoadingStats>({ inCache: true });

  const filterModel: FilterModel = reactive({
    sportType: '',
    starred: false,
  });
  const useRoutes = ref(false);

  const error = ref<string>();

  let socketController = new AbortController();

  const allMapItems = computed<readonly MapItem[]>(() =>
    useRoutes.value ? allRoutes.value : allActivities.value,
  );

  const stats = computed(() => (useRoutes.value ? routeStats.value : activityStats.value));

  const visibleMapItems = computed<readonly MapItem[]>(() => {
    const filters: ((value: MapItem) => boolean)[] = [
      filterModel.sportType &&
        ((item: MapItem) => filterModel.sportType?.split(',').includes(item.type) ?? true),

      filterModel.starred && ((item: MapItem) => !item.route || item.starred),
    ]
      // Remove falsy filters
      .filter((f): f is (value: MapItem) => boolean => !!f);

    return filters.length
      ? allMapItems.value.filter((item) => filters.every((filter) => filter(item)))
      : allMapItems.value;
  });

  /** A map of all gear, where null represents gear that is not yet fetched */
  const gear = reactive(new Map<string, Gear | null>());

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

  function receiveRoutes(routes: Route[], start?: Date, end?: Date): void {
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

  function loadFromActivityCache(
    partial = false,
    start?: Date | undefined,
    end?: Date | undefined,
  ): void {
    const activities = getCachedActivities();
    if (activities?.length) {
      if (!partial) {
        activityStats.value = {
          inCache: true,
          finding: { started: true, finished: true, length: activities.length },
        };
      }
      receiveActivities(activities, undefined, start, end);
    }
  }

  function loadFromRouteCache(): void {
    const routes = getCachedRoutes();
    if (routes?.length) {
      routeStats.value = {
        inCache: true,
        finding: { started: true, finished: true, length: routes.length },
      };

      receiveRoutes(routes);
    }
  }

  function loadFromCache() {
    loadFromActivityCache(false);
    loadFromRouteCache();
  }

  function cancelLoading() {
    socketController.abort();
    socketController = new AbortController();
  }

  function discardCache(clearStorage = false, start?: Date, end?: Date): void {
    cancelLoading();
    clearMapItems(clearStorage, start, end);
  }

  function clearMapItems(clearStorage = false, start?: Date, end?: Date): void {
    if (useRoutes.value) {
      clearCachedRoutes();
      routeStats.value = { cleared: true, inCache: false };
      allRoutes.value = [];
    } else {
      if (clearStorage) {
        clearCachedActivities(start, end);
      }
      activityStats.value = { cleared: true, inCache: false };
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

    discardCache(routes || !partial, start, end);

    if (!routes && partial) loadFromActivityCache(partial, start, end);

    const setStats = (stats: LoadingStats) => {
      if (routes) routeStats.value = stats;
      else activityStats.value = stats;
    };
    setStats({ inCache: false });
    error.value = undefined;

    let latestActivityDate = startTimestamp;

    const protocol = window.location.protocol.includes('https') ? 'wss' : 'ws';
    const socket = new Socket(
      `${protocol}://${window.location.host}/api/activities`,
      (data: ResponseMessage) => {
        switch (data.type) {
          case 'stats': {
            const oldStats = stats.value;
            setStats({ inCache: false, finding: data.finding });
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
            receiveRoutes(data.routes, start, end);
            appendCachedRoutes(data.routes);
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
          error.value = `Error fetching ${routes ? 'routes' : 'activities'}`;
        } else {
          stats.value.closed = true;
        }
      },
      socketController,
    );

    const { version: serverVersion } = await socket.sendRequest({ version: true }, 'version');

    const storeVersion = getActivityStore().version;
    if (storeVersion !== serverVersion) {
      allActivities.value = [];
      resetStore(serverVersion);
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

  async function load(partial: boolean, start?: Date, end?: Date): Promise<void> {
    await sockets({ partial, routes: useRoutes.value, start, end });
  }

  loadFromCache();

  return {
    continueLogin,
    stats,
    filterModel,
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
