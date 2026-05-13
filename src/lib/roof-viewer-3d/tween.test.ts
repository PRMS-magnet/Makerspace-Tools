import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ColorTween } from './tween';

describe('ColorTween', () => {
  it('linearly lerps endpoints when ease is identity', () => {
    const tween = new ColorTween(100, (t) => t);
    const out = new THREE.Color();
    tween.start([
      { from: new THREE.Color(0x000000), to: new THREE.Color(0xffffff), target: out },
    ], 0);
    tween.update(50);
    expect(out.r).toBeCloseTo(0.5, 2);
    expect(out.g).toBeCloseTo(0.5, 2);
    expect(out.b).toBeCloseTo(0.5, 2);
  });

  it('clamps t at 1 when elapsed >= duration', () => {
    const tween = new ColorTween(100, (t) => t);
    const out = new THREE.Color(0, 0, 0);
    tween.start([
      { from: new THREE.Color(0, 0, 0), to: new THREE.Color(1, 0, 0), target: out },
    ], 0);
    tween.update(500);
    expect(out.r).toBeCloseTo(1, 5);
    expect(tween.isActive()).toBe(false);
  });

  it('a second start() captures the current interpolated state', () => {
    const tween = new ColorTween(100, (t) => t);
    const out = new THREE.Color();
    tween.start([
      { from: new THREE.Color(0, 0, 0), to: new THREE.Color(1, 1, 1), target: out },
    ], 0);
    tween.update(50);
    expect(out.r).toBeCloseTo(0.5, 2);
    tween.start([
      { from: out.clone(), to: new THREE.Color(1, 0, 0), target: out },
    ], 50);
    tween.update(100);
    expect(out.r).toBeCloseTo(0.75, 2);
    expect(out.g).toBeCloseTo(0.25, 2);
  });
});
