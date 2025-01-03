import { MapItemStats, SportType } from '@strava-heatmapper/shared/interfaces';

const elevationLossSports: readonly SportType[] = [
  // SportType.AlpineSki,
  // SportType.BackcountrySki,
  // SportType.Canoeing,
  // SportType.Kayaking,
];

export function getElevationLoss(item: MapItemStats): number | undefined {
  return !item.route && item.type && elevationLossSports.includes(item.type)
    ? item.elevation?.loss
    : undefined;
}

const noElevationGainSports: readonly SportType[] = [
  // SportType.AlpineSki,
  SportType.Crossfit,
  SportType.Elliptical,
  SportType.Handcycle,
  SportType.IceSkate,
  SportType.InlineSkate,
  SportType.Kitesurf,
  SportType.Rowing,
  SportType.Sail,
  SportType.Skateboard,
  SportType.Soccer,
  SportType.StandUpPaddling,
  SportType.Surfing,
  SportType.Swim,
  SportType.WeightTraining,
  SportType.Windsurf,
  SportType.Yoga,
];

export function getElevationGain(item: MapItemStats): number | undefined {
  return item.route || !item.type || !noElevationGainSports.includes(item.type)
    ? item.elevation?.gain
    : undefined;
}
