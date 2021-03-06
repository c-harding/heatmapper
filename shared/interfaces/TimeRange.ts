interface TimeRange {
  start?: number;
  end?: number;
}

function sort(ranges: TimeRange[]): TimeRange[] {
  return ranges.slice().sort(({ start: a = -Infinity }, { start: b = -Infinity }) => a - b);
}
function* pairs(ranges: TimeRange[]): Generator<[TimeRange?, TimeRange?]> {
  for (let i = 0; i <= ranges.length; i += 1) {
    yield [ranges[i - 1], ranges[i]];
  }
}

namespace TimeRange {
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

  export function invert(ranges: TimeRange[]): TimeRange[] {
    const merged: TimeRange[] = [];
    for (const [pre, post] of pairs(merge(ranges))) {
      if (pre && pre.end === undefined) continue;
      if (post && post.start === undefined) continue;
      merged.push({ start: pre?.end, end: post?.start });
    }
    return merged;
  }

  export function subtract(ranges: TimeRange[], toSubtract: TimeRange[]): TimeRange[] {
    return invert(invert(ranges).concat(toSubtract));
  }

  export function cap(ranges: TimeRange[], start = 0, end?: number): TimeRange[] {
    return subtract(ranges, [{ start: end ?? Date.now() / 1000 }, { end: start }]);
  }
}

export default TimeRange;
