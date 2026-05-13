import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Vec3 } from './vec3';
import { cross3, dot3, length3, sub3 } from './vec3';
import {
  planeFromThreePoints,
  pointPlaneDistance,
  planeIntersection,
  pointOnLine,
} from './plane';

const arbCoord = fc.double({ min: -100, max: 100, noNaN: true });
const arbVec3 = fc.tuple(arbCoord, arbCoord, arbCoord) as fc.Arbitrary<Vec3>;

describe('planeFromThreePoints', () => {
  it('XY plane from three coplanar points', () => {
    const p = planeFromThreePoints([0, 0, 0], [1, 0, 0], [0, 1, 0])!;
    expect(Math.abs(p.normal[2])).toBeCloseTo(1, 9);
    expect(p.normal[0]).toBeCloseTo(0, 9);
    expect(p.normal[1]).toBeCloseTo(0, 9);
  });

  it('returns null for collinear points', () => {
    const p = planeFromThreePoints([0, 0, 0], [1, 1, 1], [2, 2, 2]);
    expect(p).toBeNull();
  });
});

describe('pointPlaneDistance', () => {
  it('zero for a point on the plane', () => {
    const plane = { point: [0, 0, 0] as Vec3, normal: [0, 0, 1] as Vec3 };
    expect(pointPlaneDistance([5, 7, 0], plane)).toBeCloseTo(0, 9);
  });

  it('matches z-distance for the XY plane', () => {
    const plane = { point: [0, 0, 0] as Vec3, normal: [0, 0, 1] as Vec3 };
    expect(pointPlaneDistance([0, 0, 3], plane)).toBeCloseTo(3, 9);
    expect(pointPlaneDistance([0, 0, -2.5], plane)).toBeCloseTo(-2.5, 9);
  });
});

describe('planeIntersection', () => {
  it('XY plane and XZ plane meet along the X axis', () => {
    const xy = { point: [0, 0, 0] as Vec3, normal: [0, 0, 1] as Vec3 };
    const xz = { point: [0, 0, 0] as Vec3, normal: [0, 1, 0] as Vec3 };
    const line = planeIntersection(xy, xz)!;
    expect(line).not.toBeNull();

    expect(Math.abs(line.direction[0])).toBeCloseTo(1, 9);
    expect(line.direction[1]).toBeCloseTo(0, 9);
    expect(line.direction[2]).toBeCloseTo(0, 9);
  });

  it('parallel planes return null', () => {
    const a = { point: [0, 0, 0] as Vec3, normal: [0, 0, 1] as Vec3 };
    const b = { point: [0, 0, 5] as Vec3, normal: [0, 0, 1] as Vec3 };
    expect(planeIntersection(a, b)).toBeNull();
  });

  it('intersection line direction is perpendicular to both plane normals', () => {
    fc.assert(fc.property(arbVec3, arbVec3, arbVec3, arbVec3, (p1, n1, p2, n2) => {
      if (length3(n1) < 1 || length3(n2) < 1) return;
      const planeA = { point: p1, normal: n1 };
      const planeB = { point: p2, normal: n2 };
      const result = planeIntersection(planeA, planeB);
      if (result === null) return;
      const tol = 1e-3;
      expect(Math.abs(dot3(result.direction, n1)) / length3(n1)).toBeLessThan(tol);
      expect(Math.abs(dot3(result.direction, n2)) / length3(n2)).toBeLessThan(tol);
    }));
  });

  it('intersection origin lies on both planes', () => {
    fc.assert(fc.property(arbVec3, arbVec3, arbVec3, arbVec3, (p1, n1, p2, n2) => {
      if (length3(n1) < 1 || length3(n2) < 1) return;
      const planeA = { point: p1, normal: n1 };
      const planeB = { point: p2, normal: n2 };
      const result = planeIntersection(planeA, planeB);
      if (result === null) return;
      const distA = pointPlaneDistance(result.origin, planeA);
      const distB = pointPlaneDistance(result.origin, planeB);
      expect(Math.abs(distA)).toBeLessThan(1e-3);
      expect(Math.abs(distB)).toBeLessThan(1e-3);
    }));
  });

  it('matches the gable-with-perpendicular-dormer case (equal pitch, 45 deg plan angle)', () => {

    const theta = Math.atan2(8, 12);
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const mainPlane = {
      point: [0, 0, 0] as Vec3,
      normal: [0, sinT, cosT] as Vec3,
    };

    const dormerPlane = {
      point: [0, 0, 0] as Vec3,
      normal: [sinT, 0, cosT] as Vec3,
    };
    const valley = planeIntersection(mainPlane, dormerPlane)!;
    expect(valley).not.toBeNull();

    const dirXY = [valley.direction[0], valley.direction[1]];
    const planAngleFromY = Math.atan2(dirXY[0], dirXY[1]);
    expect(Math.abs(Math.abs(planAngleFromY) - Math.PI / 4)).toBeLessThan(1e-9);
  });
});

describe('pointOnLine', () => {
  it('t=0 gives origin', () => {
    const line = { origin: [1, 2, 3] as Vec3, direction: [4, 5, 6] as Vec3 };
    expect(pointOnLine(line, 0)).toEqual([1, 2, 3]);
  });

  it('t=1 gives origin + direction', () => {
    const line = { origin: [0, 0, 0] as Vec3, direction: [1, 2, 3] as Vec3 };
    expect(pointOnLine(line, 1)).toEqual([1, 2, 3]);
  });

  it('t=-1 gives origin - direction', () => {
    const line = { origin: [10, 0, 0] as Vec3, direction: [1, 0, 0] as Vec3 };
    expect(pointOnLine(line, -1)).toEqual([9, 0, 0]);
  });
});
