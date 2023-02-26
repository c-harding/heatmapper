import type { PaddingOptions } from 'mapbox-gl';

export default class Viewport implements PaddingOptions {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly left: number,
    readonly right: number,
    readonly top: number,
    readonly bottom: number,
  ) {}
  get aspectRatio(): number {
    return (this.height - this.top - this.bottom) / (this.width - this.left - this.right);
  }

  proportion(otherAspectRatio: number): number {
    return (
      Math.min(this.aspectRatio, otherAspectRatio) / Math.max(this.aspectRatio, otherAspectRatio)
    );
  }
}
