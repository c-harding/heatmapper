interface TimeRange {
  /** The start of the range, a unix timestamp in seconds */
  start?: number;

  /** The end of the range, a unix timestamp in seconds */
  end?: number;
}

/** Sort ranges by their start date */
function sort(ranges: TimeRange[]): TimeRange[] {
  return ranges.slice().sort(({ start: a = -Infinity }, { start: b = -Infinity }) => a - b);
}

/**
 * Generate every consecutive pair of ranges.
 *
 * The first pair will have undefined as the first entry, and the last pair will have undefined as the second entry.
 */
function* pairs(ranges: TimeRange[]): Generator<[TimeRange?, TimeRange?]> {
  for (let i = 0; i <= ranges.length; i += 1) {
    yield [ranges[i - 1], ranges[i]];
  }
}

namespace TimeRange {
  /**
   * Normalise a set of ranges by merging overlaps
   * @param ranges the input time ranges
   * @returns a simplified set representing the same ranges
   */
  export function merge(ranges: TimeRange[]): TimeRange[] {
    const merged: TimeRange[] = [];
    let previous: TimeRange | undefined;

    for (const range of sort(ranges)) {
      if (previous === undefined) previous = { ...range };
      else if (previous.end === undefined) break;
      else if (range.start !== undefined && previous.end < range.start) {
        merged.push(previous);
        previous = { ...range };
      } else if (range.end === undefined || previous.end < range.end) {
        previous.end = range.end;
      }
    }
    if (previous !== undefined) merged.push(previous);
    return merged;
  }

  /**
   * Get the inverse of time ranges, i.e. the times not lying in the input
   * @param ranges the input time ranges
   * @returns The ranges of times not included in the input
   */
  export function invert(ranges: TimeRange[]): TimeRange[] {
    const merged: TimeRange[] = [];
    for (const [pre, post] of pairs(merge(ranges))) {
      if (pre && pre.end === undefined) continue;
      if (post && post.start === undefined) continue;
      merged.push({ start: pre?.end, end: post?.start });
    }
    return merged;
  }

  /**
   * Subtract one set of time ranges from another
   *
   * @param ranges The input ranges
   * @param toSubtract The ranges to subtract
   * @returns The ranges of times lying in the input but not in `toSubtract`
   */
  export function subtract(ranges: TimeRange[], toSubtract: TimeRange[]): TimeRange[] {
    return invert(invert(ranges).concat(toSubtract));
  }

  /**
   * Restrict the provided time ranges to only include the parts lying between a given start and end time
   * @param ranges The input time ranges
   * @param start The earliest time to consider (unix timestamp in seconds)
   * @param end The latest time to consider (unix timestamp in seconds)
   * @returns The parts of the input time ranges that lie between the start and end times
   */
  export function cap(ranges: TimeRange[], start = 0, end?: number): TimeRange[] {
    return subtract(ranges, [{ start: end ?? Date.now() / 1000 }, { end: start }]);
  }

  /**
   * Determine whether the provided time ranges include the given time
   * @param ranges The input time ranges
   * @param time The time to compare with the ranges
   * @returns True if the time falls within one of the ranges, else false.
   */
  export function includes(ranges: TimeRange[], time: number) {
    return ranges.some(({ start = 0, end = Date.now() / 1000 }) => start <= time && time <= end);
  }
}

export default TimeRange;
