export interface ActivityMap {
  id: number;
  map: string;
}

export default interface Activity extends ActivityMap {
  name: string;
  date: number;
  end: number;
  type: string;
  dateString: string[];
  distance: number;
  gear?: string;
}
