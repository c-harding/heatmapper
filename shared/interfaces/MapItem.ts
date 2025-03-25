import type Activity from './Activity';
import { type ActivityStats } from './Activity';
import type Route from './Route';
import { type RouteStats } from './Route';

export type MapItemStats = ActivityStats | RouteStats;

export type CombinedMapItemStats = MapItemStats & {
  activityCount: number;
  routeCount: number;
  selectedCount: number;
};

type MapItem = Activity | Route;

export default MapItem;
