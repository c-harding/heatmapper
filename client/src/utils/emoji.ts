import { type SportType } from '@strava-heatmapper/shared/interfaces';

const GYM_EMOJI = '🏋️';

const SKI_EMOJI = '⛷️';

const RUN_EMOJI = '🏃';

const RIDE_EMOJI = '🚲';

const MOUNTAIN_BIKE_EMOJI = '🚵';

const WINTER_EMOJI = '❄️';

const SAIL_EMOJI = '⛵';

const CANOE_EMOJI = '🛶';

const SURF_EMOJI = '🏄';

const TENNIS_EMOJI = '🎾';

const OTHER_EMOJI = ' ';

const stravaEmojis: Record<SportType, string> = {
  AlpineSki: SKI_EMOJI,
  BackcountrySki: SKI_EMOJI,
  Canoeing: CANOE_EMOJI,
  Crossfit: GYM_EMOJI,
  EBikeRide: RIDE_EMOJI,
  Elliptical: OTHER_EMOJI,
  Golf: '⛳',
  Handcycle: RIDE_EMOJI,
  Hike: '🥾',
  IceSkate: '⛸️',
  InlineSkate: '🛼',
  Kayaking: CANOE_EMOJI,
  Kitesurf: '🪁',
  NordicSki: SKI_EMOJI,
  Ride: RIDE_EMOJI,
  RockClimbing: '🧗',
  RollerSki: SKI_EMOJI,
  Rowing: '🚣',
  Run: RUN_EMOJI,
  Sail: SAIL_EMOJI,
  Skateboard: '🛹',
  Snowboard: '🏂',
  Snowshoe: WINTER_EMOJI,
  Soccer: '⚽️',
  StairStepper: GYM_EMOJI,
  StandUpPaddling: SURF_EMOJI,
  Surfing: SURF_EMOJI,
  Swim: '🏊',
  Velomobile: RIDE_EMOJI,
  VirtualRide: RIDE_EMOJI,
  VirtualRun: RUN_EMOJI,
  Walk: '🚶',
  WeightTraining: GYM_EMOJI,
  Wheelchair: '🧑‍🦽',
  Windsurf: SAIL_EMOJI,
  Workout: OTHER_EMOJI,
  Yoga: '🧘',
  TrailRun: RUN_EMOJI,
  GravelRide: MOUNTAIN_BIKE_EMOJI,
  Badminton: '🏸',
  EMountainBikeRide: MOUNTAIN_BIKE_EMOJI,
  HighIntensityIntervalTraining: RUN_EMOJI,
  MountainBikeRide: MOUNTAIN_BIKE_EMOJI,
  Pickleball: TENNIS_EMOJI,
  Pilates: '🤸🏼‍♀️',
  Racquetball: TENNIS_EMOJI,
  Squash: TENNIS_EMOJI,
  TableTennis: '🏓',
  Tennis: TENNIS_EMOJI,
  VirtualRow: '🚣',
};

export const sportIconEmoji = (type: SportType) => {
  return stravaEmojis[type] ?? OTHER_EMOJI;
};
