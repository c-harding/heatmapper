import {
  type FindingStats,
  type Gear,
  type MapItem,
  type MapItemType,
} from '@strava-heatmapper/shared/interfaces';
import { type SportTypesAndGroups } from '@strava-heatmapper/shared/interfaces/SportType';
import { type InjectionKey, type Ref } from 'vue';
export interface LoadingStats {
  closed?: boolean;
  finding?: FindingStats;
  cleared?: boolean;
  inCache: boolean;
}

export interface RangeFilter {
  // These fields are both readonly to avoid problems with shallow copies of the filter model
  readonly min?: number;
  readonly max?: number;
}

export interface FilterModel {
  sportType?: string;

  /** Set to true to only show starred routes, or false to only show unfiltered routes */
  starred?: boolean;

  distance?: RangeFilter;
  elevation?: RangeFilter;
}

export type MapItemTypes = Partial<Record<MapItemType, boolean>>;

export interface ActivityService {
  readonly continueLogin: Readonly<Ref<((withCookies: boolean) => void) | undefined>>;
  readonly stats: Readonly<Ref<LoadingStats>>;
  readonly filterModel: FilterModel;
  readonly error: Readonly<Ref<string | undefined>>;
  readonly gear: ReadonlyMap<string, Gear | null>;
  readonly useRoutes: Ref<boolean>;

  readonly mapItems: Readonly<Ref<readonly MapItem[]>>;
  readonly availableSports: Readonly<Ref<SportTypesAndGroups | undefined>>;

  cancelLoading(): void;
  discardCache(mapItemTypes?: boolean | MapItemTypes, clearStorage?: boolean): void;
  load(partial: boolean, start?: Date, end?: Date): Promise<void>;
}

export const activityServiceToken: InjectionKey<ActivityService> = Symbol('ActivityService');
