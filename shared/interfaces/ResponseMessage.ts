import type Activity from './Activity';
import type Gear from './Gear';
import type Route from './Route';

interface VersionMessage {
  type: 'version';
  version: number;
}
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

export interface FindingStats {
  started: boolean;
  finished: boolean;
  length: number;
}

export interface StatsMessage {
  type: 'stats';
  finding: FindingStats;
}

export interface GearMessage {
  type: 'gear';
  id: string;
  gear: Gear;
}

type ResponseMessage =
  | VersionMessage
  | ActivitiesMessage
  | MapsMessage
  | StatsMessage
  | RoutesMessage
  | LoginMessage
  | GearMessage;

export type ResponseMessageType = ResponseMessage['type'];

export type ResponseMessageOfType<T extends ResponseMessageType> = ResponseMessage & { type: T };

export default ResponseMessage;
