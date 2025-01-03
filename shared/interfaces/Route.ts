import type SportType from './SportType';

export interface RouteStats {
  route: true;
  distance: number;
  elevation: { gain: number };
  type?: SportType;
}

export default interface Route extends RouteStats {
  id: string;
  name: string;
  date: number;
  map: string;
  type: SportType;
  starred: boolean;
}
