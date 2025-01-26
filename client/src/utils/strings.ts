import { formatInt } from './numberFormat';

export function count(n: number | null, singular: string, plural = singular + 's'): string {
  if (n === null) return plural;
  switch (n) {
    case 0:
      return `no ${plural}`;
    case 1:
      return `1 ${singular}`;
    default:
      return `${formatInt(n)} ${plural}`;
  }
}

export function countAdjective(n: number | null, adjective: string): string {
  if (n === null) return adjective;
  switch (n) {
    case 0:
      return `none ${adjective}`;
    default:
      return `${formatInt(n)} ${adjective}`;
  }
}

export const countActivities = (n: number | null) => count(n, 'activity', 'activities');

export const countRoutes = (n: number | null) => count(n, 'route');

export const countSelected = (n: number | null) => countAdjective(n, 'selected');

export const countOtherSessions = (n: number | null) => count(n, 'other session');

export const capitalise = (string: string) => string.slice(0, 1).toUpperCase() + string.slice(1);

export const nonEmpties = (...args: string[]) => args.filter(Boolean);
