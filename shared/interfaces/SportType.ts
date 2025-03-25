export enum SportType {
  AlpineSki = 'AlpineSki',
  BackcountrySki = 'BackcountrySki',
  Badminton = 'Badminton',
  Canoeing = 'Canoeing',
  Crossfit = 'Crossfit',
  EBikeRide = 'EBikeRide',
  Elliptical = 'Elliptical',
  EMountainBikeRide = 'EMountainBikeRide',
  Golf = 'Golf',
  GravelRide = 'GravelRide',
  Handcycle = 'Handcycle',
  HighIntensityIntervalTraining = 'HighIntensityIntervalTraining',
  Hike = 'Hike',
  IceSkate = 'IceSkate',
  InlineSkate = 'InlineSkate',
  Kayaking = 'Kayaking',
  Kitesurf = 'Kitesurf',
  MountainBikeRide = 'MountainBikeRide',
  NordicSki = 'NordicSki',
  Pickleball = 'Pickleball',
  Pilates = 'Pilates',
  Racquetball = 'Racquetball',
  Ride = 'Ride',
  RockClimbing = 'RockClimbing',
  RollerSki = 'RollerSki',
  Rowing = 'Rowing',
  Run = 'Run',
  Sail = 'Sail',
  Skateboard = 'Skateboard',
  Snowboard = 'Snowboard',
  Snowshoe = 'Snowshoe',
  Soccer = 'Soccer',
  Squash = 'Squash',
  StairStepper = 'StairStepper',
  StandUpPaddling = 'StandUpPaddling',
  Surfing = 'Surfing',
  Swim = 'Swim',
  TableTennis = 'TableTennis',
  Tennis = 'Tennis',
  TrailRun = 'TrailRun',
  Velomobile = 'Velomobile',
  VirtualRide = 'VirtualRide',
  VirtualRow = 'VirtualRow',
  VirtualRun = 'VirtualRun',
  Walk = 'Walk',
  WeightTraining = 'WeightTraining',
  Wheelchair = 'Wheelchair',
  Windsurf = 'Windsurf',
  Workout = 'Workout',
  Yoga = 'Yoga',
}

export default SportType;

export const sportGroups = Object.freeze<Record<string, string>>({
  'Hike,Snowshoe,Run,TrailRun,Walk': 'All on foot',
  'Run,TrailRun': 'All running',
  'Hike,Walk': 'All walking',
  'EBikeRide,GravelRide,Handcycle,MountainBikeRide,Ride,Velomobile,VirtualRide': 'All biking',
  'AlpineSki,BackcountrySki,IceSkate,Snowboard,Snowshoe,NordicSki': 'All winter sports',
});

export const sportTypes = Object.freeze<Record<SportType, string>>({
  AlpineSki: 'Downhill skiing',
  BackcountrySki: 'Off-piste skiing',
  Badminton: 'Badminton',
  Canoeing: 'Canoeing',
  Crossfit: 'Crossfit',
  EBikeRide: 'E-bike',
  Elliptical: 'Cross-trainer',
  EMountainBikeRide: 'E-MTB',
  Golf: 'Golf',
  GravelRide: 'Gravel biking',
  Handcycle: 'Handcycling',
  HighIntensityIntervalTraining: 'HIIT',
  Hike: 'Hiking',
  IceSkate: 'Ice skating',
  InlineSkate: 'Inline skating',
  Kayaking: 'Kayaking',
  Kitesurf: 'Kitesurfing',
  MountainBikeRide: 'Mountain biking',
  NordicSki: 'Cross-country skiing',
  Pickleball: 'Pickleball',
  Pilates: 'Pilates',
  Racquetball: 'Racquetball',
  Ride: 'Biking',
  RockClimbing: 'Rock climbing',
  RollerSki: 'Roller skiing',
  Rowing: 'Rowing',
  Run: 'Running',
  Sail: 'Sailing',
  Skateboard: 'Skateboarding',
  Snowboard: 'Snowboarding',
  Snowshoe: 'Snowshoing',
  Soccer: 'Football',
  Squash: 'Squash',
  StairStepper: 'Stair stepper',
  StandUpPaddling: 'SUP',
  Surfing: 'Surfing',
  Swim: 'Swimming',
  TableTennis: 'Table tennis',
  Tennis: 'Tennis',
  TrailRun: 'Trail running',
  Velomobile: 'Velomobile',
  VirtualRide: 'Virtual cycling',
  VirtualRow: 'Rowing machine',
  VirtualRun: 'Virtual running',
  Walk: 'Walking',
  WeightTraining: 'Weight training',
  Wheelchair: 'Wheelchair',
  Windsurf: 'Windsurfing',
  Workout: 'Workout',
  Yoga: 'Yoga',
});

export interface SportTypesAndGroups {
  sportGroups: Readonly<Record<string, string>>;
  sportTypes: Readonly<Record<string, string>>;
}

export const routeTypeMap = {
  1: SportType.Ride,
  2: SportType.Run,
  3: SportType.Walk,
  4: SportType.Hike,
  5: SportType.TrailRun,
  6: SportType.MountainBikeRide,
  7: SportType.GravelRide,
  8: SportType.Swim,
} satisfies Record<number, SportType>;
