import { type PaddingOptions } from 'mapbox-gl';

export default class Viewport {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly offsets: PaddingOptions,
  ) {}

  withOffset(newOffsets: Partial<PaddingOptions>): Viewport {
    return new Viewport(this.width, this.height, {
      left: Math.max(newOffsets.left ?? 0, this.offsets.left),
      right: Math.max(newOffsets.right ?? 0, this.offsets.right),
      top: Math.max(newOffsets.top ?? 0, this.offsets.top),
      bottom: Math.max(newOffsets.bottom ?? 0, this.offsets.bottom),
    });
  }

  withPadding(padding: number): Viewport {
    const { left, right, top, bottom } = this.offsets;
    return new Viewport(this.width, this.height, {
      left: left + padding,
      right: right + padding,
      top: top + padding,
      bottom: bottom + padding,
    });
  }

  get safeWidth(): number {
    return this.width - this.offsets.left - this.offsets.right;
  }
  get safeHeight(): number {
    return this.height - this.offsets.top - this.offsets.bottom;
  }
  get aspectRatio(): number {
    return this.safeHeight / this.safeWidth;
  }

  proportion(otherAspectRatio: number): number {
    return (
      Math.min(this.aspectRatio, otherAspectRatio) / Math.max(this.aspectRatio, otherAspectRatio)
    );
  }

  screenArea(otherAspectRatio: number): number {
    return this.safeHeight * this.safeWidth * this.proportion(otherAspectRatio);
  }
}
