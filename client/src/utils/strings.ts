export function count(n: number | null, singular: string, plural = singular + 's'): string {
  if (n === null) return plural;
  switch (n) {
    case 0:
      return `no ${plural}`;
    case 1:
      return `1 ${singular}`;
    default:
      return `${n} ${plural}`;
  }
}

export const countActivities = (n: number | null) => count(n, 'activity', 'activities');

export const countRoutes = (n: number | null) => count(n, 'route');

export const countOtherSessions = (n: number | null) => count(n, 'other session');

export const capitalise = (string: string) => string.slice(0, 1).toUpperCase() + string.slice(1);

export const nonEmpties = (...args: string[]) => args.filter(Boolean);
