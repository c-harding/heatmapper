import { CombinedMapItemStats, MapItem, SportType } from '@strava-heatmapper/shared/interfaces';
import { getElevationGain, getElevationLoss } from './elevationConfig';

const isDefined = (val: number | false | undefined): val is number => !!val || val === 0;
const add = (a: number | undefined, b: number) => (a ?? 0) + b;
const uniqueValueOrUndefined = <T>(acc: T | undefined, val: T) => (acc === val ? acc : undefined);

export function combineStats(items: readonly MapItem[], selectedCount = 0): CombinedMapItemStats {
  const routeCount = items.filter((item) => item.route).length;
  const activityCount = items.length - routeCount;
  const distance = items
    .map((item) => item.distance)
    .filter(isDefined)
    .reduce(add, 0);
  const elevationGain = items.map(getElevationGain).filter(isDefined).reduce(add, undefined);
  const elevationLoss = items.map(getElevationLoss).filter(isDefined).reduce(add, undefined);
  const movingTime = items
    .map((item) => !item.route && item.movingTime)
    .filter(isDefined)
    .reduce(add, undefined);
  const type = items
    .map((item) => item.type)
    .reduce<SportType | undefined>(uniqueValueOrUndefined, undefined);

  if (activityCount === 0) {
    return {
      route: true,
      distance,
      elevation: { gain: elevationGain ?? 0 },
      type,
      routeCount,
      activityCount,
      selectedCount,
    };
  }

  const maxElevation = items
    .map((item) => !item.route && item.elevation?.max)
    .filter(isDefined)
    .reduce<number | undefined>((a, b) => Math.max(a ?? 0, b), undefined);

  const minElevation = items
    .map((item) => !item.route && item.elevation?.min)
    .filter(isDefined)
    .reduce<number | undefined>((a, b) => Math.min(a ?? 0, b), undefined);

  return {
    activityCount,
    routeCount,
    selectedCount,
    route: false,
    distance,
    movingTime: movingTime ?? 0,
    elevation:
      elevationGain !== undefined ||
      elevationLoss !== undefined ||
      maxElevation !== undefined ||
      minElevation !== undefined
        ? {
            gain: elevationGain ?? 0,
            loss: elevationLoss ?? 0,
            max: maxElevation ?? 0,
            min: minElevation ?? 0,
          }
        : undefined,
  };
}
