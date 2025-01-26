import type Activity from './Activity';
import { ActivityStats } from './Activity';
import type Route from './Route';
import { RouteStats } from './Route';

export type MapItemStats = ActivityStats | RouteStats;

export type CombinedMapItemStats = MapItemStats & {
  activityCount: number;
  routeCount: number;
  selectedCount: number;
};

type MapItem = Activity | Route;

export default MapItem;
