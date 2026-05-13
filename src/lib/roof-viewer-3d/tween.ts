import type * as THREE from 'three';

export interface ColorTrack {
  from: THREE.Color;
  to: THREE.Color;
  target: THREE.Color;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class ColorTween {
  private tracks: ColorTrack[] = [];
  private startTimeMs = 0;
  private active = false;

  constructor(private durationMs: number, private ease: (t: number) => number = easeInOutCubic) {}

  start(tracks: ColorTrack[], nowMs: number): void {
    this.tracks = tracks.map((t) => ({ from: t.from.clone(), to: t.to.clone(), target: t.target }));
    this.startTimeMs = nowMs;
    this.active = this.tracks.length > 0;
  }

  cancel(): void {
    this.active = false;
    this.tracks = [];
  }

  isActive(): boolean {
    return this.active;
  }

  update(nowMs: number): void {
    if (!this.active) return;
    const elapsed = nowMs - this.startTimeMs;
    const tRaw = elapsed <= 0 ? 0 : Math.min(1, elapsed / this.durationMs);
    const t = this.ease(tRaw);
    for (const track of this.tracks) {
      track.target.r = track.from.r + (track.to.r - track.from.r) * t;
      track.target.g = track.from.g + (track.to.g - track.from.g) * t;
      track.target.b = track.from.b + (track.to.b - track.from.b) * t;
    }
    if (tRaw >= 1) {
      this.active = false;
    }
  }
}
