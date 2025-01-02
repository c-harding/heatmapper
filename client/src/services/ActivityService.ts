import {
  type CombinedMapItemStats,
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

export interface FilterModel {
  sportType?: string;

  /** Set to true to only show starred routes, or false to only show unfiltered routes */
  starred?: boolean;
}

export type MapItemTypes = Partial<Record<MapItemType, boolean>>;

export enum GroupLevel {
  OFF = '',
  WEEKLY_MO = 'WEEKLY_MO',
  WEEKLY_SA = 'WEEKLY_SA',
  WEEKLY_SU = 'WEEKLY_SU',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export interface MapItemGroup {
  items: MapItem[];
  stats: CombinedMapItemStats;
  date: string;
}

export interface ActivityService {
  readonly continueLogin: Readonly<Ref<((withCookies: boolean) => void) | undefined>>;
  readonly stats: Readonly<Ref<LoadingStats>>;
  readonly filterModel: FilterModel;
  readonly error: Readonly<Ref<string | undefined>>;
  readonly gear: ReadonlyMap<string, Gear | null>;
  readonly useRoutes: Ref<boolean>;
  readonly groupLevel: Ref<GroupLevel>;

  readonly mapItems: Readonly<Ref<readonly MapItem[]>>;
  readonly groupedMapItems: Readonly<Ref<readonly MapItemGroup[]>>;
  readonly availableSports: Readonly<Ref<SportTypesAndGroups | undefined>>;

  cancelLoading(): void;
  discardCache(mapItemTypes?: boolean | MapItemTypes, clearStorage?: boolean): void;
  load(partial: boolean, start?: Date, end?: Date): Promise<void>;
}

export const activityServiceToken: InjectionKey<ActivityService> = Symbol('ActivityService');
