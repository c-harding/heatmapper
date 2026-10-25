export type FilterField = keyof FilterModel;

export interface RangeFilter {
  // These fields are both readonly to avoid problems with shallow copies of the filter model
  readonly min?: number;
  readonly max?: number;
}

/** Simplify a range filter by removing min:0. Only for use with non-negative metrics. */
export function liveRange(range: RangeFilter | undefined): RangeFilter | undefined {
  const min = range?.min || undefined;
  const max = range?.max;
  if (min === undefined && max === undefined) return undefined;
  return { min, max };
}

export interface FilterModel {
  sportType?: string;

  /** Set to true to only show starred routes, or false to only show unfiltered routes */
  starred?: boolean;

  distance?: RangeFilter;
  elevation?: RangeFilter;
  gear?: string;

  /** Set to true to only show private items, or false to only show non-private items */
  isPrivate?: boolean;

  /** Set to true to only show commutes, or false to only show non-commutes */
  isCommute?: boolean;

  device?: string;
}

const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const asBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);
const asNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

function asRange(value: unknown): RangeFilter | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { min, max } = value as Record<string, unknown>;
  const range = { min: asNumber(min), max: asNumber(max) };
  return range.min === undefined && range.max === undefined ? undefined : range;
}

/** Each field's reader, for a stored value that can be anything */
const fieldReaders: { [F in FilterField]-?: (value: unknown) => FilterModel[F] } = {
  sportType: asString,
  starred: asBoolean,
  distance: asRange,
  elevation: asRange,
  gear: asString,
  isPrivate: asBoolean,
  isCommute: asBoolean,
  device: asString,
};

/** The fields of a stored filter that have the right type */
export function readFilterModel(value: Record<string, unknown>): FilterModel {
  return Object.fromEntries(
    Object.entries(fieldReaders)
      .map(([field, read]) => [field, read(value[field])])
      .filter(([, fieldValue]) => fieldValue !== undefined),
  ) as FilterModel;
}

/** The entries of a stored list that name a field */
export function readFilterFields(value: unknown[]): Set<FilterField> {
  return new Set(
    value.filter(
      (field): field is FilterField =>
        typeof field === 'string' && Object.hasOwn(fieldReaders, field),
    ),
  );
}

// Check for surrounding quotes to indicate exact match.
export const exactDeviceQuotes = ['"', "'", '“', '”', '‘', '’', '„', '‚', '`', '«', '»', '‹', '›'];
export const quotePairs: Record<string, string> = {
  '“': '”',
  '‘': '’',
  '„': '“',
  '‚': '‘',
  '«': '»',
  '»': '«',
  '‹': '›',
  '›': '‹',
};

export const parseDeviceFilter = (
  deviceFilter: string | undefined,
): { enabled: boolean; exact: boolean; name: string } => {
  if (!deviceFilter) return { enabled: false, exact: false, name: '' };

  if (exactDeviceQuotes.includes(deviceFilter.at(0) ?? '')) {
    if (deviceFilter.length > 1 && exactDeviceQuotes.includes(deviceFilter.at(-1) ?? '')) {
      return { enabled: true, exact: true, name: deviceFilter.slice(1, -1).toLowerCase().trim() };
    } else {
      // If only the start quote is present, treat it as a normal filter, as the user is still typing
      return { enabled: true, exact: false, name: deviceFilter.slice(1).toLowerCase().trim() };
    }
  } else {
    return { enabled: true, exact: false, name: deviceFilter.toLowerCase().trim() };
  }
};
