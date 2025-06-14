import polyline from '@mapbox/polyline';
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import mapboxgl, { LngLat, LngLatBounds, type LngLatLike } from 'mapbox-gl';

export function getBestCenter(
  items: readonly MapItem[],
  {
    resolution = 1 / 8,
    blurSteps = 1,
  }: { resolution?: number | LngLatLike; blurSteps?: number } = {},
): LngLatBounds | undefined {
  const counter = new LocationBucketCounter(resolution, blurSteps);
  counter.addItems(items);
  return counter.getBestBucket();
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
    const minBucket = this.getBucket(bounds.getSouthWest());
    const maxBucket = this.getBucket(bounds.getNorthEast());

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
    const x = Math.round(coord.lng / this.lngResolution);
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

    return coordinates.reduce((acc, coord) => acc.extend(coord), new mapboxgl.LngLatBounds());
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
