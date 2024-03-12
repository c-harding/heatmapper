import type { FindingStats, Gear, MapItem } from '@strava-heatmapper/shared/interfaces';
import type { InjectionKey, Ref } from 'vue';
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
  continueLogin: Ref<((withCookies: boolean) => void) | null>;
  stats: Ref<LoadingStats>;
  clientStats: Ref<ClientStats>;
  sportType: Ref<string>;
  error: Ref<string | undefined>;
  gear: ReadonlyMap<string, Gear | null>;

  mapItems: Readonly<Ref<readonly MapItem[]>>;

  clearMapItems(): void;
  loadPartial(start?: Date, end?: Date): Promise<void>;
  loadRoutes(start?: Date, end?: Date): Promise<void>;
}

export const activityServiceToken: InjectionKey<ActivityService> = Symbol('ActivityService');
