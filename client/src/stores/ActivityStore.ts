import {
  type Activity,
  type CombinedMapItemStats,
  type FindingStats,
  type Gear,
  type MapItem,
  type MapItemType,
  type ResponseMessage,
  type Route,
  sportGroups,
  sportTypes,
  TimeRange,
} from '@strava-heatmapper/shared/interfaces';
import { type SportTypesAndGroups } from '@strava-heatmapper/shared/interfaces/SportType';
import { defineStore } from 'pinia';
import { computed, reactive, type Ref, ref, shallowRef, toRef, watch } from 'vue';

import Socket from '@/socket';
import { type FilterField, type FilterModel } from '@/types/FilterModel';
import config from '@/utils/config';
import { groupMapItems } from '@/utils/groupMapItems';
import {
  appendCachedActivities,
  appendCachedRoutes,
  clearCachedActivities,
  clearCachedRoutes,
  getActivityStore,
  getCachedGear,
  getCachedRoutes,
  getStoreMeta,
  loadFilterFields,
  loadFilterModel,
  resetStore,
  saveCachedGear,
  saveFilterFields,
} from '@/utils/storage';

import { useContinueLoginStore } from './ContinueLoginStore';

export interface LoadingStats {
  closed?: boolean;
  finding?: FindingStats;
  cleared?: boolean;
  inCache: boolean;
}

export enum GroupLevel {
  OFF = '',
  WEEKLY_MO = 'WEEKLY_MO',
  WEEKLY_SA = 'WEEKLY_SA',
  WEEKLY_SU = 'WEEKLY_SU',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export type MapItemTypes = Partial<Record<MapItemType, boolean>>;

export interface MapItemGroup {
  items: MapItem[];
  stats: CombinedMapItemStats;
  date: string;
}

/** One day in milliseconds */
const DAY = 24 * 60 * 60 * 1000;

const MIN_TIMEZONE_ADJUSTMENT = 14 * 60 * 60 * 1000;
const MAX_TIMEZONE_ADJUSTMENT = -12 * 60 * 60 * 1000;

export function doesSportTypeMatch(sportTypeFilter: string, sportType: string) {
  return sportTypeFilter.split(',').includes(sportType);
}

export const useActivityStore = defineStore('activity', () => {
  const useRoutes = ref(false); // TODO: link to URL

  const allRoutes = shallowRef<Route[]>([]);
  const allActivities = shallowRef<Activity[]>([]);
  const groupLevel = ref<GroupLevel>(GroupLevel.OFF);

  let needsUserValidation = config.VALIDATE_USER_BEFORE_CACHE;

  const continueLoginStore = useContinueLoginStore();

  const routeStats = ref<LoadingStats>({ inCache: false });
  const activityStats = ref<LoadingStats>({ inCache: true });

  const filterModel: FilterModel = reactive(loadFilterModel() ?? {});
  const filterFields: Set<FilterField> = reactive(
    loadFilterFields() ?? new Set(['sportType', 'starred']),
  );
  watch(filterFields, saveFilterFields);

  const error = ref<string>();

  let socketController = new AbortController();

  const allMapItems = computed<readonly MapItem[]>(() =>
    useRoutes.value ? allRoutes.value : allActivities.value,
  );

  const availableSports = computed<SportTypesAndGroups | undefined>(() => {
    if (allMapItems.value.length === 0) return undefined;
    const presentSportTypes = [...new Set(allMapItems.value.map((item) => item.type))];
    const presentSportGroups = Object.keys(sportGroups).filter((group) =>
      presentSportTypes.some((type) => doesSportTypeMatch(group, type)),
    );
    return {
      sportTypes: Object.fromEntries(presentSportTypes.map((type) => [type, sportTypes[type]])),
      sportGroups: Object.fromEntries(presentSportGroups.map((type) => [type, sportGroups[type]])),
    };
  });

  const stats = computed(() => (useRoutes.value ? routeStats.value : activityStats.value));

  const visibleMapItems = computed<readonly MapItem[]>(() => {
    const sportType = filterModel.sportType;
    const filters: ((value: MapItem) => boolean)[] = [
      filterFields.has('sportType') &&
        sportType &&
        ((item: MapItem) => doesSportTypeMatch(sportType, item.type)),

      filterFields.has('starred') &&
        filterModel.starred !== undefined &&
        ((item: MapItem) => !item.route || item.starred === filterModel.starred),

      filterFields.has('distance') &&
        filterModel.distance?.min !== undefined &&
        ((item: MapItem) => item.distance >= (filterModel.distance?.min ?? -Infinity)),
      filterFields.has('distance') &&
        filterModel.distance?.max !== undefined &&
        ((item: MapItem) => item.distance <= (filterModel.distance?.max ?? Infinity)),

      filterFields.has('elevation') &&
        filterModel.elevation?.min !== undefined &&
        ((item: MapItem) =>
          item.elevation?.gain && item.elevation.gain >= (filterModel.elevation?.min ?? -Infinity)),
      filterFields.has('elevation') &&
        filterModel.elevation?.max !== undefined &&
        ((item: MapItem) =>
          item.elevation?.gain && item.elevation.gain <= (filterModel.elevation?.max ?? Infinity)),

      filterFields.has('gear') &&
        filterModel.gear &&
        ((item: MapItem) => item.route || item.gear === filterModel.gear),
    ]
      // Remove falsy filters
      .filter((f): f is (value: MapItem) => boolean => !!f);

    return filters.length
      ? allMapItems.value.filter((item) => filters.every((filter) => filter(item)))
      : allMapItems.value;
  });

  const groupedMapItems = computed<readonly MapItemGroup[]>(() =>
    groupMapItems(visibleMapItems.value, groupLevel.value),
  );

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

  async function requestGear(ids: (string | undefined)[], socket?: Socket) {
    const validIds = ids.filter((id?: string): id is string => !!id);

    for (const gearId of validIds) {
      if (gear.has(gearId)) continue;
      if (socket) {
        gear.set(gearId, null);
        await socket.sendRequest({
          gear: gearId,
        });
      } else {
        const cachedGear = await getCachedGear(gearId);
        if (cachedGear) {
          gear.set(gearId, cachedGear);
        }
      }
    }
  }

  async function startLoading(socket: Socket, activityRanges?: TimeRange[], routes = false) {
    await socket.sendRequest({
      activities: activityRanges,
      routes,
    });
  }

  function receiveRoutes(routes: Route[], start?: Date, end?: Date): void {
    const filteredRoutes = filterActivities(routes, start, end);
    addMapItems(allRoutes, filteredRoutes);
  }

  function receiveActivities(
    activities: Activity[],
    socket: Socket | undefined,
    start: Date | undefined,
    end: Date | undefined,
  ): void {
    const filteredActivities = filterActivities(activities, start, end);
    addMapItems(allActivities, filteredActivities);
    void requestGear(
      filteredActivities.map(({ gear }) => gear),
      socket,
    );
  }

  async function loadFromActivityCache(
    partial = false,
    start?: Date,
    end?: Date,
  ): Promise<TimeRange[]> {
    const { covered, activities } = await getActivityStore();
    if (activities.length) {
      if (!partial) {
        activityStats.value = {
          inCache: true,
          finding: { started: true, finished: true, length: activities.length },
        };
      }
      receiveActivities(activities, undefined, start, end);
    }
    return covered;
  }

  async function loadFromRouteCache(): Promise<void> {
    const routes = await getCachedRoutes();
    if (routes.length) {
      routeStats.value = {
        inCache: true,
        finding: { started: true, finished: true, length: routes.length },
      };

      receiveRoutes(routes);
    }
  }

  async function loadFromCache() {
    if (needsUserValidation) {
      await sockets({});
      needsUserValidation = false;
    }
    loadFromActivityCache(false);
    loadFromRouteCache();
  }

  function cancelLoading() {
    socketController.abort();
    socketController = new AbortController();
  }

  function discardCache(
    mapItemTypes: boolean | MapItemTypes,
    clearStorage = false,
    start?: Date,
    end?: Date,
  ): void {
    cancelLoading();
    clearMapItems(
      typeof mapItemTypes === 'boolean'
        ? { activities: mapItemTypes, routes: mapItemTypes }
        : mapItemTypes,
      clearStorage,
      start,
      end,
    );
  }

  async function clearMapItems(
    { activities = false, routes = false }: MapItemTypes,
    clearStorage = false,
    start?: Date,
    end?: Date,
  ): Promise<void> {
    if (activities) {
      activityStats.value = { cleared: true, inCache: false };
      allActivities.value = [];
      if (clearStorage) {
        await clearCachedActivities(start, end);
      }
    }
    if (routes) {
      routeStats.value = { cleared: true, inCache: false };
      allRoutes.value = [];
      await clearCachedRoutes();
    }
  }

  interface SocketOptions extends MapItemTypes {
    partial?: boolean;
    start?: Date;
    end?: Date;
  }

  async function sockets({
    partial = false,
    activities = false,
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

    discardCache({ activities, routes }, !partial, start, end);

    if (activities) activityStats.value = { inCache: false };
    if (routes) routeStats.value = { inCache: false };
    error.value = undefined;

    let latestActivityDate = startTimestamp;

    function checkFinished(socket: Socket | undefined): boolean {
      const finished =
        !continueLoginStore.continueLogin &&
        (!activities || activityStats.value.finding?.finished === true) &&
        (!routes || routeStats.value.finding?.finished === true) &&
        Iterator.from(gear.values()).every(Boolean);
      if (finished) {
        socket?.close();
      }
      return finished;
    }

    const protocol = window.location.protocol.includes('https') ? 'wss' : 'ws';
    const socket = new Socket(
      `${protocol}://${window.location.host}/api/activities`,
      (data: ResponseMessage) => {
        switch (data.type) {
          case 'stats': {
            if (data.for === 'activities') {
              const wasFinished = activityStats.value.finding?.finished;
              activityStats.value = { inCache: false, finding: data.finding };

              if (!wasFinished && data.finding.finished) {
                void appendCachedActivities([], latestActivityDate, startTimestamp);
              }
            } else if (data.for === 'routes') {
              routeStats.value = { inCache: false, finding: data.finding };
            } else {
              console.warn('Received unknown stat type', data.for);
            }
            break;
          }
          case 'activities': {
            const activityCount = data.activities.length;
            if (activityCount === 0) break;
            receiveActivities(data.activities, socket, start, end);
            checkFinished(socket);

            // API returns roughly in descending order
            const latestDate = new Date(data.activities[0].date).getTime() / 1000;
            const earliestDate = new Date(data.activities[activityCount - 1].date).getTime() / 1000;
            latestActivityDate = Math.max(latestActivityDate, latestDate);
            void appendCachedActivities(data.activities, latestDate, earliestDate);
            break;
          }
          case 'routes': {
            const routeCount = data.routes.length;
            if (routeCount === 0) break;
            receiveRoutes(data.routes, start, end);
            checkFinished(socket);
            void appendCachedRoutes(data.routes);
            break;
          }
          case 'gear': {
            gear.set(data.id, data.gear);
            void saveCachedGear(data.id, data.gear);
            break;
          }
          case 'login': {
            continueLoginStore.waitForLogin(data.cookie, data.url);
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

    const { version: serverVersion, user } = await socket.sendRequest(
      { handshake: true },
      'handshake',
    );

    const store = getStoreMeta();
    if (store.version !== serverVersion || store.user !== user) {
      allActivities.value = [];
      allRoutes.value = [];
      gear.clear();
      await resetStore(serverVersion, user);
    }

    let activityRanges: TimeRange[] | undefined;
    if (!activities) {
      activityRanges = undefined;
    } else if (partial) {
      const covered = await loadFromActivityCache(partial, start, end);
      activityRanges = TimeRange.cap(TimeRange.invert(covered), startTimestamp ?? 0, endTimestamp);
    } else {
      activityRanges = [{ start: startTimestamp, end: endTimestamp }];
    }

    if (!checkFinished(socket)) {
      // TODO: send routeRanges
      startLoading(socket, activityRanges, routes);
    }

    await socket.completion();
  }

  async function load(partial: boolean, start?: Date, end?: Date): Promise<void> {
    await sockets({ partial, routes: useRoutes.value, activities: !useRoutes.value, start, end });
  }

  loadFromCache();

  return {
    continueLogin: toRef(continueLoginStore, 'continueLogin'),
    stats,
    routeStats,
    activityStats,
    filterModel,
    filterFields,
    useRoutes,
    groupLevel,
    error,
    gear,

    mapItems: visibleMapItems,
    groupedMapItems,
    availableSports,

    cancelLoading,
    discardCache,
    load,
  };
});
