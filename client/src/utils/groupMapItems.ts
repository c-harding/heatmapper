import { type MapItem } from '@strava-heatmapper/shared/interfaces';

import { GroupLevel, type MapItemGroup } from '@/stores/ActivityStore';

import { formatDateRange, formatMonth, formatYear } from './numberFormat';
import { combineStats } from './stats';

function startOfGroup(group: GroupLevel, item: MapItem) {
  const date = new Date(item.date);
  let targetDayOfWeek: number;
  switch (group) {
    case GroupLevel.OFF:
    case GroupLevel.MONTHLY:
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth());
    case GroupLevel.YEARLY:
      return Date.UTC(date.getUTCFullYear(), 0, 1);

    case GroupLevel.WEEKLY_MO:
      targetDayOfWeek = 1;
      break;
    case GroupLevel.WEEKLY_SA:
      targetDayOfWeek = 6;
      break;
    case GroupLevel.WEEKLY_SU:
      targetDayOfWeek = 0;
      break;
  }
  const dayOfWeek = date.getUTCDay();
  const offset = (dayOfWeek + 7 - targetDayOfWeek) % 7;
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - offset);
  return date;
}

function groupLabel(group: GroupLevel, date: number) {
  switch (group) {
    case GroupLevel.OFF:
      return '';
    case GroupLevel.WEEKLY_MO:
    case GroupLevel.WEEKLY_SA:
    case GroupLevel.WEEKLY_SU: {
      const endOfWeek = new Date(date);
      endOfWeek.setDate(endOfWeek.getUTCDate() + 7);
      return formatDateRange(date, +endOfWeek - 1);
    }
    case GroupLevel.MONTHLY:
      return formatMonth(date);
    case GroupLevel.YEARLY:
      return formatYear(date);
  }
}

export function groupMapItems(
  items: readonly MapItem[],
  groupLevel: GroupLevel,
): readonly MapItemGroup[] {
  const groups = Map.groupBy(items, (item) => +startOfGroup(groupLevel, item));
  return Array.from(groups, ([groupDate, items]) => ({
    date: groupLabel(groupLevel, groupDate),
    items,
    stats: combineStats(items),
  }));
}
