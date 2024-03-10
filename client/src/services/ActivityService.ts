import type { Gear, MapItem } from '@strava-heatmapper/shared/interfaces';
import type { InjectionKey, Ref } from 'vue';

export interface LoadingStatsFinding {
  started?: boolean;
  finished?: boolean;
  length?: number;
}

export interface LoadingStats {
  status?: string;
  finding?: LoadingStatsFinding;
  cleared?: boolean;
}

export interface FilterModel {
  sportType?: string;
  start?: Date;
  end?: Date;
}

export interface ClientStats {
  mapsRequested: number;
  mapsLoaded: number;
  mapsNotCached: number;
  inCache: boolean;
}

export interface ActivityService {
  continueLogin: Ref<((withCookies: boolean) => void) | null>;
  stats: Ref<LoadingStats>;
  clientStats: Ref<ClientStats>;
  sportType: Ref<string>;
  start: Ref<Date | undefined>;
  end: Ref<Date | undefined>;
  error: Ref<string | undefined>;
  gear: ReadonlyMap<string, Gear | null>;

  mapItems: Readonly<Ref<readonly MapItem[]>>;

  clearMapItems(): void;
  loadPartial(): Promise<void>;
  loadRoutes(): Promise<void>;
}

export const activityServiceToken: InjectionKey<ActivityService> = Symbol('ActivityService');
