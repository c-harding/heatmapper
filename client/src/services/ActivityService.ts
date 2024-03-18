import { type FindingStats, type Gear, type MapItem } from '@strava-heatmapper/shared/interfaces';
import { type InjectionKey, type Ref } from 'vue';
export interface LoadingStats {
  status?: string;
  finding?: FindingStats;
  cleared?: boolean;
}

export interface FilterModel {
  sportType?: string;
  start?: Date;
  end?: Date;
}

// TODO: combine LoadingStats and ClientStats
export interface ClientStats {
  mapsRequested: number;
  mapsLoaded: number;
  mapsNotCached: number;
  inCache: boolean;
}

export interface ActivityService {
  continueLogin: Readonly<Ref<((withCookies: boolean) => void) | undefined>>;
  stats: Readonly<Ref<LoadingStats>>;
  clientStats: Readonly<Ref<ClientStats>>;
  sportType: Ref<string>;
  error: Ref<string | undefined>;
  gear: ReadonlyMap<string, Gear | null>;
  useRoutes: Ref<boolean>;

  mapItems: Readonly<Ref<readonly MapItem[]>>;

  discardCache(clearStorage?: boolean): void;
  load(start?: Date, end?: Date): Promise<void>;
}

export const activityServiceToken: InjectionKey<ActivityService> = Symbol('ActivityService');
