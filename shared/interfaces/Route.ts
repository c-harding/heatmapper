export default interface Route {
  route: true;
  id: string;
  name: string;
  date: number;
  map: string;
  distance: number;
  elevation: { gain: number };
  type: 'Ride' | 'Run' | 'Walk';
  subType: 'Road' | 'MountainBike' | 'Cross' | 'Trail' | 'Mixed';
  dateString: string[];
  starred: boolean;
}
