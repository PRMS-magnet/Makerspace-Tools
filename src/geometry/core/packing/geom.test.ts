import { describe, it, expect } from 'vitest';
import type { Polygon } from '../types';
import {
  signedArea, ensureCCW, convexHull, minkowskiSumConvex, nfpConvex,
  ifpRect, pointStrictlyInside, isPointOnSegment, inflateConvex, bboxOf,
} from './geom';

function rect(w: number, h: number): Polygon {
  return [[0, 0], [w, 0], [w, h], [0, h]];
}

describe('signedArea / ensureCCW', () => {
  it('CCW unit square has area +1', () => {
    expect(signedArea(rect(1, 1))).toBeCloseTo(1, 6);
  });
  it('CW polygon gets reversed by ensureCCW', () => {
    const cw: Polygon = [[0, 0], [0, 1], [1, 1], [1, 0]];
    expect(signedArea(cw)).toBeLessThan(0);
    expect(signedArea(ensureCCW(cw))).toBeGreaterThan(0);
  });
});

describe('convexHull', () => {
  it('returns a convex polygon for points on a unit square plus an interior point', () => {
    const pts: Polygon = [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]];
    const h = convexHull(pts);
    expect(h).toHaveLength(4);
    expect(signedArea(h)).toBeCloseTo(1, 6);
  });
  it('handles a triangle as-is', () => {
    const t: Polygon = [[0, 0], [2, 0], [1, 1]];
    const h = convexHull(t);
    expect(h).toHaveLength(3);
  });
});

describe('minkowskiSumConvex', () => {
  it('two unit squares produce a 2x2 square', () => {
    const r = minkowskiSumConvex(rect(1, 1), rect(1, 1));
    const b = bboxOf(r);
    expect(b.width).toBeCloseTo(2, 6);
    expect(b.height).toBeCloseTo(2, 6);
    expect(signedArea(r)).toBeCloseTo(4, 6);
  });
  it('square (1x1) ⊕ triangle gives a hexagon (or pentagon), area = 1 + 0.5 + perimeter*1/2', () => {

    const tri: Polygon = [[0, 0], [1, 0], [0, 1]];
    const r = minkowskiSumConvex(rect(1, 1), tri);
    expect(signedArea(r)).toBeGreaterThan(2);

    const b = bboxOf(r);
    expect(b.width).toBeCloseTo(2, 6);
    expect(b.height).toBeCloseTo(2, 6);
  });
});

describe('nfpConvex', () => {
  it('NFP of two identical unit squares: at any vertex of the NFP, B touches A without overlap', () => {
    const A = rect(1, 1);
    const B = rect(1, 1);
    const nfp = nfpConvex(A, B);

    const b = bboxOf(nfp);
    expect(b.width).toBeCloseTo(2, 6);
    expect(b.height).toBeCloseTo(2, 6);
    expect(b.minX).toBeCloseTo(-1, 6);
    expect(b.minY).toBeCloseTo(-1, 6);
  });
  it('NFP for unit-square pair has vertices at (1,1), (-1,1), (-1,-1), (1,-1)', () => {
    const A = rect(1, 1);
    const B = rect(1, 1);
    const nfp = nfpConvex(A, B);
    const has = (x: number, y: number) => nfp.some(([px, py]) => Math.abs(px - x) < 1e-6 && Math.abs(py - y) < 1e-6);
    expect(has(1, 1)).toBe(true);
    expect(has(-1, 1)).toBe(true);
    expect(has(-1, -1)).toBe(true);
    expect(has(1, -1)).toBe(true);
  });
});

describe('ifpRect', () => {
  it('a 2x1 piece in strip [0..5] x [0..100]: ref-point Xs in [0, 3]', () => {
    const B = rect(2, 1);
    const ifp = ifpRect(B, 0, 5, 0, 100);
    expect(ifp).not.toBeNull();
    expect(ifp!.xMin).toBeCloseTo(0, 6);
    expect(ifp!.xMax).toBeCloseTo(3, 6);
    expect(ifp!.yMin).toBeCloseTo(0, 6);
    expect(ifp!.yMax).toBeCloseTo(99, 6);
  });
  it('with margin 0.5: a 2x1 piece in strip [0.5..4.5] gives xMin=0.5, xMax=2.5', () => {
    const ifp = ifpRect(rect(2, 1), 0.5, 4.5, 0.5, 99.5);
    expect(ifp!.xMin).toBeCloseTo(0.5, 6);
    expect(ifp!.xMax).toBeCloseTo(2.5, 6);
    expect(ifp!.yMin).toBeCloseTo(0.5, 6);
  });
  it('a piece wider than the strip returns null', () => {
    const B = rect(10, 1);
    expect(ifpRect(B, 0, 5, 0, 100)).toBeNull();
  });
});

describe('pointStrictlyInside', () => {
  it('returns false for boundary points', () => {
    expect(pointStrictlyInside([0, 0.5], rect(1, 1))).toBe(false);
    expect(pointStrictlyInside([0.5, 0], rect(1, 1))).toBe(false);
  });
  it('returns true for interior, false for exterior', () => {
    expect(pointStrictlyInside([0.5, 0.5], rect(1, 1))).toBe(true);
    expect(pointStrictlyInside([2, 2], rect(1, 1))).toBe(false);
  });
});

describe('isPointOnSegment', () => {
  it('true for endpoints and midpoint', () => {
    expect(isPointOnSegment([0, 0], [0, 0], [2, 0])).toBe(true);
    expect(isPointOnSegment([2, 0], [0, 0], [2, 0])).toBe(true);
    expect(isPointOnSegment([1, 0], [0, 0], [2, 0])).toBe(true);
  });
  it('false for off-line points', () => {
    expect(isPointOnSegment([1, 1], [0, 0], [2, 0])).toBe(false);
  });
});

describe('inflateConvex', () => {
  it('inflating a unit square by 0.1 grows its area', () => {
    const inflated = inflateConvex(rect(1, 1), 0.1);
    const a0 = signedArea(rect(1, 1));
    const a1 = signedArea(inflated);
    expect(a1).toBeGreaterThan(a0);

    const b = bboxOf(inflated);
    expect(b.width).toBeCloseTo(1.2, 6);
  });
  it('inflate by 0 returns equivalent polygon', () => {
    const inflated = inflateConvex(rect(1, 1), 0);
    expect(signedArea(inflated)).toBeCloseTo(1, 6);
  });
});
