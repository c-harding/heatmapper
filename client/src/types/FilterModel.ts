export type FilterField = keyof FilterModel;

export interface RangeFilter {
  // These fields are both readonly to avoid problems with shallow copies of the filter model
  readonly min?: number;
  readonly max?: number;
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
