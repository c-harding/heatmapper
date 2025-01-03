import type Activity from './Activity';
import { ActivityStats } from './Activity';
import type Route from './Route';
import { RouteStats } from './Route';

export type MapItemStats = ActivityStats | RouteStats;

type MapItem = Activity | Route;
export default MapItem;
