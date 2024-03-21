import type SportType from './SportType';

export default interface Route {
  route: true;
  id: string;
  name: string;
  date: number;
  map: string;
  distance: number;
  elevation: { gain: number };
  type: SportType;
  starred: boolean;
}
