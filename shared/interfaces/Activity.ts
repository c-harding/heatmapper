export interface ActivityMap {
  id: number;
  map: string;
}

export interface Elevation {
  max: number;
  min: number;
  gain: number;
  loss: number;
}

export default interface Activity extends ActivityMap {
  name: string;
  date: number;
  end: number;
  type: string;
  dateString: string[];
  distance: number;
  gear?: string;
  elevation?: Elevation;
}
