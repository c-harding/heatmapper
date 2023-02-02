import type Activity from './Activity';
import type Gear from './Gear';
import type Route from './Route';

interface ActivitiesMessage {
  type: 'activities';
  activities: Activity[];
}
interface RoutesMessage {
  type: 'routes';
  routes: Route[];
}
interface MapsMessage {
  type: 'maps';
  chunk: Record<string, string>;
}

interface LoginMessage {
  type: 'login';
  cookie: string;
  url: string;
}

export interface StatsMessage {
  type: 'stats';
  finding: { started: boolean; finished: boolean; length: number };
}

export interface GearMessage {
  type: 'gear';
  id: string;
  gear: Gear;
}

type ResponseMessage =
  | ActivitiesMessage
  | MapsMessage
  | StatsMessage
  | RoutesMessage
  | LoginMessage
  | GearMessage;

export default ResponseMessage;
