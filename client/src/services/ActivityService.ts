import type {
  FindingStats,
  Gear,
  MapItem,
  MapItemStats,
  MapItemType,
} from '@strava-heatmapper/shared/interfaces';
import { type InjectionKey, type Ref } from 'vue';
export interface LoadingStats {
  closed?: boolean;
  finding?: FindingStats;
  cleared?: boolean;
  inCache: boolean;
}

export interface FilterModel {
  sportType?: string;
  starred: boolean;
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
  stats: MapItemStats;
  date: string;
}

export interface ActivityService {
  continueLogin: Readonly<Ref<((withCookies: boolean) => void) | undefined>>;
  stats: Readonly<Ref<LoadingStats>>;
  readonly filterModel: FilterModel;
  error: Ref<string | undefined>;
  gear: ReadonlyMap<string, Gear | null>;
  useRoutes: Ref<boolean>;
  groupLevel: Ref<GroupLevel>;

  mapItems: Readonly<Ref<readonly MapItem[]>>;
  groupedMapItems: Readonly<Ref<readonly MapItemGroup[]>>;

  cancelLoading(): void;
  discardCache(mapItemTypes?: boolean | MapItemTypes, clearStorage?: boolean): void;
  load(partial: boolean, start?: Date, end?: Date): Promise<void>;
}

export const activityServiceToken: InjectionKey<ActivityService> = Symbol('ActivityService');
