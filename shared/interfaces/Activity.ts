import type SportType from './SportType';

export interface ActivityMap {
  id: string;
  map: string;
}

export interface Elevation {
  max: number;
  min: number;
  gain: number;
  loss: number;
}

export interface ActivityStats {
  route: false;
  distance: number;
  elevation?: Elevation;
  movingTime: number;
  type?: SportType;
}

export default interface Activity extends ActivityMap, ActivityStats {
  name: string;
  date: number;
  localDate: number;
  localEnd: number;
  end: number;
  type: SportType;
  device?: string;
  gear?: string;
  isPrivate?: boolean;
  isCommute?: boolean;
}
