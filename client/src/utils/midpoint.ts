import polyline from '@mapbox/polyline';
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { type LngLatBoundsLike, type LngLatLike } from 'mapbox-gl';

// Equivalent to the mapbox classes, but defined separately to avoid the mapbox bundle blocking the initial bundle
class LngLat {
  constructor(
    readonly lng: number,
    readonly lat: number,
  ) {}

  static convert(input: LngLatLike) {
    if (Array.isArray(input)) {
      return new LngLat(input[0], input[1]);
    } else if ('lng' in input) {
      return new LngLat(input.lng, input.lat);
    } else {
      return new LngLat(input.lon, input.lat);
    }
  }
}

class LngLatBounds {
  southWest: LngLat;
  northEast: LngLat;
  constructor(init: [west: number, south: number, east: number, north: number]);
  constructor(init: [southWest: LngLatLike, northEast: LngLatLike]);
  constructor(southWest: LngLatLike, northEast: LngLatLike);
  constructor(
    ...args:
      | [[west: number, south: number, east: number, north: number]]
      | [[southWest: LngLatLike, northEast: LngLatLike]]
      | [southWest: LngLatLike, northEast: LngLatLike]
  ) {
    if (args.length === 2) {
      this.southWest = LngLat.convert(args[0]);
      this.northEast = LngLat.convert(args[1]);
    } else if (args[0].length === 2) {
      this.southWest = LngLat.convert(args[0][0]);
      this.northEast = LngLat.convert(args[0][1]);
    } else {
      this.southWest = new LngLat(args[0][0], args[0][1]);
      this.northEast = new LngLat(args[0][2], args[0][3]);
    }
  }
  get south() {
    return this.southWest.lat;
  }
  get west() {
    return this.southWest.lng;
  }
  get north() {
    return this.southWest.lat;
  }
  get east() {
    return this.southWest.lng;
  }

  extend(toAdd: LngLatLike): this {
    const lngLat = LngLat.convert(toAdd);
    if (lngLat.lng < this.west || lngLat.lat < this.south) {
      this.southWest = new LngLat(
        Math.min(this.west, lngLat.lng),
        Math.min(this.south, lngLat.lat),
      );
    }
    if (lngLat.lng > this.east || lngLat.lat > this.north) {
      this.northEast = new LngLat(
        Math.max(this.east, lngLat.lng),
        Math.max(this.north, lngLat.lat),
      );
    }
    return this;
  }

  static empty() {
    return new LngLatBounds([Infinity, Infinity, -Infinity, -Infinity]);
  }
}

export function getBestCenter(
  items: readonly MapItem[],
  {
    resolution = 1 / 8,
    blurSteps = 1,
  }: { resolution?: number | LngLatLike; blurSteps?: number } = {},
): LngLatBoundsLike | undefined {
  const counter = new LocationBucketCounter(resolution, blurSteps);
  counter.addItems(items);
  const bounds = counter.getBestBucket();
  return bounds && [bounds.southWest, bounds.northEast];
}

class LocationBucketCounter {
  /** The height of each bucket in degrees of longitude */
  readonly lngResolution: number;

  /** The width of each bucket in degrees of latitude */
  readonly latResolution: number;

  /** The offset for blurring */
  readonly lngBlur: number;
  readonly latBlur: number;

  constructor(
    resolution: number | LngLatLike = 0.5,

    /**
     * Determines number of additional buckets each item appears in, using Chebyshev distance.
     *
     * 0 = exactly the provided bucket,
     * 1 = also the buckets a Chebyshev distance of 1 away * 1/2,
     * 2 = also the buckets a Chebyshev distance of 2 away * 1/4.
     */
    readonly blurSteps = 1,
  ) {
    if (typeof resolution === 'number') {
      this.latResolution = this.lngResolution = resolution;
    } else {
      const { lat, lng } = LngLat.convert(resolution);
      this.lngResolution = lng;
      this.latResolution = lat;
    }

    this.lngBlur = this.blurSteps * this.lngResolution;
    this.latBlur = this.blurSteps * this.latResolution;
  }

  readonly buckets: Record<number, Record<number, number>> = {};

  private floor(value: number, resolution: number): number {
    return Math.floor(value / resolution) * resolution;
  }

  private getBucket(coordinate: LngLat) {
    return new LngLat(
      this.floor(coordinate.lng, this.lngResolution),
      this.floor(coordinate.lat, this.latResolution),
    );
  }

  private *allBuckets(bounds: LngLatBounds): Generator<[LngLat, number], void, unknown> {
    const minBucket = this.getBucket(bounds.southWest);
    const maxBucket = this.getBucket(bounds.northEast);

    const minBlur = new LngLat(minBucket.lng - this.lngBlur, minBucket.lat - this.latBlur);
    const maxBlur = new LngLat(maxBucket.lng + this.lngBlur, maxBucket.lat + this.latBlur);

    for (let lng = minBlur.lng; lng <= maxBlur.lng; lng += this.lngResolution) {
      for (let lat = minBlur.lat; lat <= maxBlur.lat; lat += this.latResolution) {
        const blurDistance = Math.max(
          0,
          Math.max(minBucket.lng - lng, lng - maxBucket.lng) / this.lngResolution,
          Math.max(minBucket.lat - lat, lat - maxBucket.lat) / this.latResolution,
        );
        const weight = 0.5 ** blurDistance;
        yield [new LngLat(lng, lat), weight];
      }
    }
  }

  private addToBucket(coord: LngLat, weight = 1) {
    const x = Math.round(((coord.lng + 360) % 360) / this.lngResolution);
    const y = Math.round(coord.lat / this.latResolution);
    const row = (this.buckets[y] ??= {});
    row[x] = (row[x] ?? 0) + weight;
  }

  addToAllBuckets(bounds: LngLatBounds) {
    for (const [coord, weight] of this.allBuckets(bounds)) {
      this.addToBucket(coord, weight);
    }
  }

  private getBounds(item: MapItem) {
    const coordinates = polyline.decode(item.map).map(([lat, lng]) => new LngLat(lng, lat));

    return coordinates.reduce((acc, coord) => acc.extend(coord), LngLatBounds.empty());
  }

  addItem(item: MapItem) {
    const bounds = this.getBounds(item);
    this.addToAllBuckets(bounds);
  }

  addItems(items: readonly MapItem[]) {
    for (const item of items) {
      this.addItem(item);
    }
  }

  getBestBucket() {
    let bestCoords: LngLatLike | undefined;
    let bestWeight = 0;
    for (const [y, row] of Object.entries(this.buckets)) {
      for (const [x, weight] of Object.entries(row)) {
        if (weight > bestWeight) {
          bestCoords = [+x * this.lngResolution, +y * this.latResolution];
          bestWeight = weight;
        }
      }
    }
    if (!bestCoords) return undefined;
    const coords = LngLat.convert(bestCoords);
    return new LngLatBounds([
      coords.lng - this.lngBlur,
      coords.lat - this.latBlur,
      coords.lng + this.lngBlur + this.lngResolution,
      coords.lat + this.latBlur + this.latResolution,
    ]);
  }
}
