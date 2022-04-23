export function count(n: number, singular: string, plural = singular + 's'): string {
  switch (n) {
    case 0:
      return `no ${plural}`;
    case 1:
      return `1 ${singular}`;
    default:
      return `${n} ${plural}`;
  }
}

export const countActivities = (n: number) => count(n, 'activity', 'activities');

export const capitalise = (string: string) => string.slice(0, 1).toUpperCase() + string.slice(1);

export const nonEmpties = (...args: string[]) => args.filter(Boolean);
