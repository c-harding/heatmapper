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

export default interface Activity extends ActivityMap {
  route: false;
  name: string;
  date: number;
  localDate: number;
  localEnd: number;
  end: number;
  type: SportType;
  movingTime: number;
  distance: number;
  gear?: string;
  elevation?: Elevation;
}
