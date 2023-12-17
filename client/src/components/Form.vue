<script setup lang="ts">
import type { Activity, Gear, ResponseMessage, Route } from '@strava-heatmapper/shared/interfaces';
import { TimeRange } from '@strava-heatmapper/shared/interfaces';
import { computed, reactive, ref, watch } from 'vue';

import activityTypes from '../activityTypes';
import { MapStyle } from '../MapStyle';
import Socket from '../socket';
import {
  appendCachedActivities,
  getCachedActivities,
  getCachedGear,
  getCachedMap,
  getCachedMaps,
  saveCachedGear,
} from '../utils/storage';
import { getActivityStore, saveCachedMaps } from '../utils/storage';
import { capitalise, count, countActivities, nonEmpties } from '../utils/strings';
import DateInput from './DateInput.vue';
import Dropdown from './Dropdown.vue';
import Login from './Login.vue';

const props = withDefaults(
  defineProps<{
    terrain?: boolean;
    mapStyle?: MapStyle;
  }>(),
  {
    terrain: false,
    mapStyle: MapStyle.STRAVA,
  },
);

/** A map of all gear, where null represents gear that is not yet fetched */
const gear = reactive(new Map<string, Gear | null>());

const emit = defineEmits<{
  (e: 'add-activities', value: Activity[] | Route[]): void;
  (e: 'clear-activities'): void;
  (e: 'add-activity-maps', value: Record<string, string>): void;
  (e: 'update:terrain', value: boolean): void;
  (e: 'update:mapStyle', value: MapStyle): void;
}>();

/** One day in milliseconds */
const DAY = 24 * 60 * 60 * 1000;

const MIN_TIMEZONE_ADJUSTMENT = 14 * 60 * 60 * 1000;
const MAX_TIMEZONE_ADJUSTMENT = -12 * 60 * 60 * 1000;

const mapStyleModel = computed<MapStyle>({
  get() {
    return props.mapStyle;
  },
  set(value) {
    emit('update:mapStyle', value);
  },
});

function findingString(
  { started = false, finished = false, length = 0 }: LoadingStats['finding'] = {},
  inCache = false,
) {
  if (finished && inCache) return `found ${countActivities(length)} in cache`;
  if (finished) return `found ${countActivities(length)}`;
  if (length) return `found ${countActivities(length)} so far`;
  if (started) return 'finding activities';
  return '';
}

function mapString(requested = 0, length = 0, uncached = 0) {
  if (uncached && requested === 0) return 'but no maps cached';
  if (uncached) return `loaded ${length} maps, ${uncached} maps not cached`;
  if (requested && requested === length) return 'loaded all maps';
  if (length) return `loaded ${length} of ${count(requested, 'map')} so far`;
  if (requested) return `requested ${count(requested, 'map')}`;
  return '';
}

function filterActivities<ActivityOrRoute extends Activity | Route>(
  activities: ActivityOrRoute[],
  type?: string,
  start?: Date | null,
  end?: Date | null,
): ActivityOrRoute[] {
  return activities.filter((activity) =>
    [
      !type || type.split(',').includes(activity.type),
      !start || activity.date >= +start,
      !end || activity.date <= +end + DAY,
    ].every(Boolean),
  );
}

const start = ref<Date | null>(null);
const end = ref<Date | null>(null);
const continueLogin = ref<((withCookies: boolean) => void) | null>(null);
const activityType = ref('');
const sortedActivityTypes = Object.entries(activityTypes)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

interface LoadingStats {
  status?: string;
  finding?: { started?: boolean; finished?: boolean; length?: number };
  cleared?: boolean;
}

const stats = ref<LoadingStats>({});

const clientStats = ref({
  mapsRequested: 0,
  mapsLoaded: 0,
  mapsNotCached: 0,
  inCache: true,
});

const error = ref<string | null>(null);

const starting = ref(false);

const statusMessage = computed(() => {
  return error.value || statsMessage();
});

function statsMessage(): string {
  // TODO: lift finding up

  if (stats.value.cleared) return 'Cleared cache';
  return capitalise(
    nonEmpties(
      findingString(stats.value.finding, clientStats.value.inCache),
      mapString(
        clientStats.value.mapsRequested,
        clientStats.value.mapsLoaded,
        clientStats.value.mapsNotCached,
      ),
    ).join(', '),
  );
}

function setError(message: string): void {
  error.value = message;
}

function clearCache(): void {
  localStorage.clear();
  document.cookie = `token=;expires=${new Date(0).toUTCString()}`;
  stats.value = { cleared: true };
  emit('clear-activities');
}

function receiveMaps(maps: Record<string, string>): void {
  clientStats.value.mapsLoaded += Object.keys(maps).length;
  emit('add-activity-maps', maps);
}

watch(activityType, () => {
  emit('clear-activities');
  loadFromCache();
});

function requestMaps(ids: (number | string)[], socket?: Socket): void {
  clientStats.value.mapsRequested += ids.length;
  const { cached, notCached } = getCachedMaps(ids);
  if (socket && notCached.length) {
    socket.sendRequest({
      maps: notCached,
    });
  }
  receiveMaps(cached);
  checkFinished(socket);
}

function requestGear(ids: (string | undefined)[], socket?: Socket) {
  const validIds = ids.filter((id?: string): id is string => !!id);

  for (const gearId of validIds) {
    if (gear.has(gearId)) continue;
    if (socket) {
      gear.set(gearId, null);
      socket.sendRequest({
        gear: gearId,
      });
    } else {
      gear.set(gearId, getCachedGear(gearId) ?? null);
    }
  }
}

function receiveActivities(activities: Activity[], socket?: Socket): void {
  const filteredActivities = filterActivities(
    activities,
    activityType.value,
    start.value,
    end.value,
  );
  requestGear(
    filteredActivities.map(({ gear }) => gear),
    socket,
  );
  emit('add-activities', filteredActivities);
  requestMaps(
    filteredActivities.map(({ id }) => id),
    socket,
  );
}

function receiveRoutes(routes: Route[], socket?: Socket): void {
  const filteredRoutes = filterActivities(routes, activityType.value, start.value, end.value);
  emit('add-activities', filteredRoutes);
  requestMaps(
    filteredRoutes.map(({ id }) => id),
    socket,
  );
}

function checkFinished(socket?: Socket): void {
  if (
    socket &&
    !starting.value &&
    clientStats.value.mapsRequested === clientStats.value.mapsLoaded &&
    stats.value.finding?.finished
  ) {
    socket.close();
  }
}

function loadFromCache(partial = false): void {
  const activities = getCachedActivities();
  if (activities && activities.length) {
    if (!partial) stats.value = { finding: { finished: true, length: activities.length } };
    const cachedActivities = activities.filter(({ id }) => getCachedMap(id));
    clientStats.value.mapsNotCached = activities.length - cachedActivities.length;
    receiveActivities(cachedActivities);
  }
}

function startLoading(socket: Socket, ranges: TimeRange[]): void {
  socket.sendRequest({
    activities: ranges,
  });
}

function startLoadingRoutes(socket: Socket): void {
  socket.sendRequest({
    routes: true,
  });
}

async function load(): Promise<void> {
  await sockets();
}

async function loadPartial(): Promise<void> {
  await sockets({ partial: true });
}

async function loadRoutes(): Promise<void> {
  await sockets({ routes: true });
}

async function sockets({ partial = false, routes = false } = {}): Promise<void> {
  emit('clear-activities');
  if (partial) loadFromCache(partial);
  clientStats.value = {
    mapsRequested: 0,
    mapsLoaded: 0,
    mapsNotCached: 0,
    inCache: false,
  };
  error.value = null;

  // The dates shown in the UI are formatted in event-local time.
  // In order to ensure that all events are correctly shown, we need to ensure that the start
  // timestamp represents the earliest point that this date is reached anywhere on Earth, and that
  // the end timestamp represents the latest point that this date ends anywhere on Earth.
  // Note that the dates are then filtered in the frontend to ensure that only those which were
  // started on the correct day according to activity-local time are shown.
  const startTimestamp = start.value ? (start.value.getTime() - MIN_TIMEZONE_ADJUSTMENT) / 1000 : 0;
  const endTimestamp =
    (end.value ? end.value.getTime() + DAY - MAX_TIMEZONE_ADJUSTMENT : Date.now()) / 1000;

  let latestActivityDate = startTimestamp;

  const protocol = window.location.protocol.includes('https') ? 'wss' : 'ws';
  const socket = new Socket(
    `${protocol}://${window.location.host}/api/activities`,
    (message) => {
      const data: ResponseMessage = JSON.parse(message.data);
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
          receiveActivities(data.activities, socket);

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
          receiveRoutes(data.routes, socket);
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
        setError('Error fetching activities');
      } else {
        stats.value = { status: 'disconnected' };
      }
    },
  );

  if (routes) {
    startLoadingRoutes(socket);
  } else {
    starting.value = true;

    let ranges: TimeRange[];
    if (partial) {
      const { covered, activities } = getActivityStore();
      ranges = TimeRange.cap(TimeRange.invert(covered), startTimestamp ?? 0, endTimestamp);
      receiveActivities(activities, socket);
    } else {
      ranges = [{ start: startTimestamp, end: endTimestamp }];
    }

    startLoading(socket, ranges);
    starting.value = false;
  }
}

defineExpose({ loadFromCache, gear });
</script>

<template>
  <aside>
    <div class="controls">
      <label>
        <span>Start date</span>
        <DateInput v-model="start" name="start" />
      </label>
      <label>
        <span>End date</span>
        <DateInput v-model="end" name="end" />
      </label>
      <label>
        <span>Activity type</span>
        <Dropdown
          v-model="activityType"
          :options="sortedActivityTypes"
          blank-value=""
          blank-label="All activities"
        />
      </label>
    </div>
    <div class="buttons">
      <button @click="loadPartial">Load</button>
      <button @click="loadRoutes">Routes</button>
      <button @click="clearCache">Clear cache</button>
    </div>
    <div class="buttons">
      <button v-if="terrain" @click="emit('update:terrain', false)">Disable 3D</button>
      <button v-else @click="emit('update:terrain', true)">Enable 3D</button>
      <select v-model="mapStyleModel">
        <option :value="MapStyle.STRAVA">Strava style</option>
        <option :value="MapStyle.HYBRID">Hybrid</option>
        <option :value="MapStyle.SATELLITE">Satellite</option>
      </select>
    </div>
    <Login
      v-if="continueLogin"
      @login="continueLogin?.(true)"
      @login-without-cookies="continueLogin?.(false)"
    />
    <p v-else :class="[error && 'error']" v-text="statusMessage" />
  </aside>
</template>

<style scoped lang="scss">
.controls {
  padding: 1em;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;

  label {
    display: flex;
    align-items: center;
    min-width: 0;
  }
}

aside > .buttons {
  margin: 5px auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
}

.error {
  color: red;
}

p.small {
  font-size: 0.8em;
}
</style>
