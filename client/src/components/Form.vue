<script setup lang="ts">
import type { Activity, ResponseMessage, Route } from '@strava-heatmapper/shared/interfaces';
import { TimeRange } from '@strava-heatmapper/shared/interfaces';
import { watch } from 'vue';
import { $$, $computed, $ref } from 'vue/macros';

import activityTypes from '../activityTypes';
import Socket from '../socket';
import { Style } from '../style';
import {
  appendCachedActivities,
  getCachedActivities,
  getCachedMap,
  getCachedMaps,
} from '../utils/storage';
import { getActivityStore, saveCachedMaps } from '../utils/storage';
import { capitalise, count, countActivities, nonEmpties } from '../utils/strings';
import DateInput from './DateInput.vue';
import Dropdown from './Dropdown.vue';
import Login from './Login.vue';

const { terrain = false, mapStyle = Style.STRAVA } = defineProps<{
  terrain?: boolean;
  mapStyle?: Style;
}>();

const emit = defineEmits<{
  (e: 'add-activities', value: Activity[] | Route[]): void;
  (e: 'clear-activities'): void;
  (e: 'add-activity-maps', value: Record<string, string>): void;
  (e: 'update:terrain', value: boolean): void;
  (e: 'update:mapStyle', value: Style): void;
}>();

const mapStyleModel = $computed<Style>({
  get() {
    return mapStyle;
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
      !end || activity.date <= +end,
    ].every(Boolean),
  );
}

let start: Date | null = $ref(null);
let end: Date | null = $ref(null);
let continueLogin: ((withCookies: boolean) => void) | null = $ref(null);
let activityType = $ref('');
const sortedActivityTypes = Object.entries(activityTypes)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

interface LoadingStats {
  status?: string;
  finding?: { started?: boolean; finished?: boolean; length?: number };
  cleared?: boolean;
}

let stats = $ref<LoadingStats>({});

let clientStats = $ref({
  mapsRequested: 0,
  mapsLoaded: 0,
  mapsNotCached: 0,
  inCache: true,
});

let error: string | null = $ref(null);

let starting = $ref(false);

const statusMessage = $computed(() => {
  return error || statsMessage();
});

function statsMessage(): string {
  // TODO: lift finding up

  if (stats.cleared) return 'Cleared cache';
  return capitalise(
    nonEmpties(
      findingString(stats.finding, clientStats.inCache),
      mapString(clientStats.mapsRequested, clientStats.mapsLoaded, clientStats.mapsNotCached),
    ).join(', '),
  );
}

function setError(message: string): void {
  error = message;
}

function clearCache(): void {
  localStorage.clear();
  document.cookie = `token=;expires=${new Date(0).toUTCString()}`;
  stats = { cleared: true };
  emit('clear-activities');
}

function receiveMaps(maps: Record<string, string>): void {
  clientStats.mapsLoaded += Object.keys(maps).length;
  emit('add-activity-maps', maps);
}

watch($$(activityType), () => {
  emit('clear-activities');
  loadFromCache();
});

function requestMaps(ids: (number | string)[], socket?: Socket): void {
  clientStats.mapsRequested += ids.length;
  const { cached, notCached } = getCachedMaps(ids);
  if (socket && notCached.length) {
    socket.sendRequest({
      maps: notCached,
    });
  }
  receiveMaps(cached);
  checkFinished(socket);
}

function receiveActivities(activities: Activity[], socket?: Socket): void {
  const filteredActivities = filterActivities(activities, activityType, start, end);
  emit('add-activities', filteredActivities);
  requestMaps(
    filteredActivities.map(({ id }) => id),
    socket,
  );
}

function receiveRoutes(routes: Route[], socket?: Socket): void {
  const filteredRoutes = filterActivities(routes, activityType, start, end);
  emit('add-activities', filteredRoutes);
  requestMaps(
    filteredRoutes.map(({ id }) => id),
    socket,
  );
}

function checkFinished(socket?: Socket): void {
  if (
    socket &&
    !starting &&
    clientStats.mapsRequested === clientStats.mapsLoaded &&
    stats.finding?.finished
  ) {
    socket.close();
  }
}

function loadFromCache(partial = false): void {
  const activities = getCachedActivities();
  if (activities && activities.length) {
    if (!partial) stats = { finding: { finished: true, length: activities.length } };
    const cachedActivities = activities.filter(({ id }) => getCachedMap(id));
    clientStats.mapsNotCached = activities.length - cachedActivities.length;
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
  clientStats = {
    mapsRequested: 0,
    mapsLoaded: 0,
    mapsNotCached: 0,
    inCache: false,
  };
  error = null;

  const startTimestamp = start ? start.getTime() / 1000 : 0;
  const endTimestamp = (end ? end.getTime() : Date.now()) / 1000;

  let latestActivityDate = startTimestamp;

  const protocol = window.location.protocol.includes('https') ? 'wss' : 'ws';
  const socket = new Socket(
    `${protocol}://${window.location.host}/api/activities`,
    (message) => {
      const data: ResponseMessage = JSON.parse(message.data);
      switch (data.type) {
        case 'stats': {
          const oldStats = stats;
          stats = data;
          if (!oldStats?.finding?.finished && data.finding.finished) {
            appendCachedActivities([], latestActivityDate, startTimestamp);
          }
          break;
        }
        case 'activities': {
          const activityCount = data.activities.length;
          if (activityCount === 0) break;
          receiveActivities(data.activities, socket);

          // API returns in descending order
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
        case 'login': {
          continueLogin = (cookies = true) => {
            if (cookies) document.cookie = `token=${data.cookie};max-age=31536000`;
            continueLogin = null;
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
        stats = { status: 'disconnected' };
      }
    },
  );

  if (routes) {
    startLoadingRoutes(socket);
  } else {
    starting = true;

    let ranges: TimeRange[];
    if (partial) {
      const { covered, activities } = getActivityStore();
      ranges = TimeRange.cap(TimeRange.invert(covered), startTimestamp ?? 0, endTimestamp);
      receiveActivities(activities, socket);
    } else {
      ranges = [{ start: startTimestamp, end: endTimestamp }];
    }

    startLoading(socket, ranges);
    starting = false;
  }
}

defineExpose({ loadFromCache });
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
        <option :value="Style.STRAVA">Strava style</option>
        <option :value="Style.HYBRID">Hybrid</option>
        <option :value="Style.SATELLITE">Satellite</option>
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
