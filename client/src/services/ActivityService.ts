import { type FindingStats, type Gear, type MapItem } from '@strava-heatmapper/shared/interfaces';
import { type InjectionKey, type Ref } from 'vue';
export interface LoadingStats {
  closed?: boolean;
  finding?: FindingStats;
  cleared?: boolean;
  inCache: boolean;
}

export interface FilterModel {
  sportType: string;
  starred: boolean;
}

export interface ActivityService {
  continueLogin: Readonly<Ref<((withCookies: boolean) => void) | undefined>>;
  stats: Readonly<Ref<LoadingStats>>;
  readonly filterModel: FilterModel;
  error: Ref<string | undefined>;
  gear: ReadonlyMap<string, Gear | null>;
  useRoutes: Ref<boolean>;

  mapItems: Readonly<Ref<readonly MapItem[]>>;

  cancelLoading(): void;
  discardCache(clearStorage?: boolean): void;
  load(partial: boolean, start?: Date, end?: Date): Promise<void>;
}

export const activityServiceToken: InjectionKey<ActivityService> = Symbol('ActivityService');
