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
}
