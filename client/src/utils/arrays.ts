export function findLastIndex<T>(xs: T[], p: (x: T) => boolean): number {
  for (let i = xs.length - 1; i >= 0; i -= 1) {
    if (p(xs[i])) return i;
  }
  return -1;
}
