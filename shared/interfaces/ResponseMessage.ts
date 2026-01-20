import type Activity from './Activity';
import type Gear from './Gear';
import type Route from './Route';

export type MapItemType = 'activities' | 'routes';

interface HandshakeMessage {
  type: 'handshake';
  version: number;
  user: number;
}
interface ActivitiesMessage {
  type: 'activities';
  activities: Activity[];
}
interface RoutesMessage {
  type: 'routes';
  routes: Route[];
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
  for: MapItemType;
  finding: FindingStats;
}

export interface GearMessage {
  type: 'gear';
  id: string;
  gear: Gear;
}

type ResponseMessage =
  | HandshakeMessage
  | ActivitiesMessage
  | StatsMessage
  | RoutesMessage
  | LoginMessage
  | GearMessage;

export type ResponseMessageType = ResponseMessage['type'];

export type ResponseMessageOfType<T extends ResponseMessageType> = ResponseMessage & { type: T };

export default ResponseMessage;
