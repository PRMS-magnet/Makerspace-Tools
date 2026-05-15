import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { splitForLength, splitPiece, applyTenon, applyMortise } from './joinery';
import type { Polygon, PolygonWithHoles } from './types';

describe('splitForLength', () => {
  it('pieces within max length pass through unchanged', () => {
    const r = splitForLength({ pieceLengthIn: 10, maxPieceLengthIn: 12, stockThicknessIn: 0.25 });
    expect(r.segments).toBe(1);
    expect(r.segmentLengthIn).toBe(10);
    expect(r.gussetCount).toBe(0);
    expect(r.gussetLengthIn).toBe(0);
    expect(r.joints).toEqual([]);
  });

  it('splits over-length pieces into ceil(L / max) segments', () => {
    const r = splitForLength({ pieceLengthIn: 20, maxPieceLengthIn: 12, stockThicknessIn: 0.25 });
    expect(r.segments).toBe(2);
    expect(r.segmentLengthIn).toBeCloseTo(10, 9);
    expect(r.gussetCount).toBe(1);
  });

  it('three-segment split for very long pieces', () => {
    const r = splitForLength({ pieceLengthIn: 30, maxPieceLengthIn: 12, stockThicknessIn: 0.25 });
    expect(r.segments).toBe(3);
    expect(r.segmentLengthIn).toBeCloseTo(10, 9);
    expect(r.gussetCount).toBe(2);
  });

  it('gusset length defaults to 3 * stock thickness', () => {
    const r = splitForLength({ pieceLengthIn: 20, maxPieceLengthIn: 12, stockThicknessIn: 0.25 });
    expect(r.gussetLengthIn).toBeCloseTo(0.75, 9);
  });

  it('respects custom lapMultiplier', () => {
    const r = splitForLength({
      pieceLengthIn: 20,
      maxPieceLengthIn: 12,
      stockThicknessIn: 0.25,
      lapMultiplier: 4,
    });
    expect(r.gussetLengthIn).toBeCloseTo(1, 9);
  });

  it('joint positions evenly distributed', () => {
    const r = splitForLength({ pieceLengthIn: 24, maxPieceLengthIn: 8, stockThicknessIn: 0.25 });
    expect(r.segments).toBe(3);
    expect(r.joints).toHaveLength(2);
    expect(r.joints[0].atIn).toBeCloseTo(8, 9);
    expect(r.joints[1].atIn).toBeCloseTo(16, 9);
  });

  it('flags middle-third joints with supportHintIn', () => {
    const r = splitForLength({ pieceLengthIn: 20, maxPieceLengthIn: 12, stockThicknessIn: 0.25 });
    expect(r.joints[0].supportHintIn).toBeCloseTo(10, 9);
  });

  it('does not flag joints near the ends', () => {
    const r = splitForLength({ pieceLengthIn: 40, maxPieceLengthIn: 12, stockThicknessIn: 0.25 });
    expect(r.joints).toHaveLength(3);
    expect(r.joints[0].supportHintIn).toBeUndefined();
    expect(r.joints[1].supportHintIn).toBeCloseTo(20, 9);
    expect(r.joints[2].supportHintIn).toBeUndefined();
  });

  it('sum of segment lengths covers original length', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: 0.05, max: 1, noNaN: true }),
        (L, M, T) => {
          const r = splitForLength({ pieceLengthIn: L, maxPieceLengthIn: M, stockThicknessIn: T });
          const totalSegmentLength = r.segments * r.segmentLengthIn;
          expect(totalSegmentLength).toBeCloseTo(L, 6);
        }
      )
    );
  });

  it('segment length never exceeds max', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: 0.05, max: 1, noNaN: true }),
        (L, M, T) => {
          const r = splitForLength({ pieceLengthIn: L, maxPieceLengthIn: M, stockThicknessIn: T });
          expect(r.segmentLengthIn).toBeLessThanOrEqual(M + 1e-9);
        }
      )
    );
  });
});

describe('splitPiece', () => {
  it('returns a single full-length segment when piece fits in max', () => {
    const r = splitPiece({ pieceLengthIn: 8, maxSegmentLengthIn: 12, stockThicknessIn: 0.125 });
    expect(r.segments.length).toBe(1);
    expect(r.segments[0].lengthIn).toBe(8);
    expect(r.splicePositionsIn).toEqual([]);
    expect(r.joints).toEqual([]);
  });

  it('equalN strategy splits into ceil(L/max) segments of equal length', () => {
    const r = splitPiece({ pieceLengthIn: 20, maxSegmentLengthIn: 8, stockThicknessIn: 0.125, strategy: 'equalN' });
    expect(r.segments.length).toBe(3);
    for (const s of r.segments) expect(s.lengthIn).toBeCloseTo(20 / 3, 6);
  });

  it('every segment is no longer than maxSegmentLengthIn', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 100, noNaN: true }),
        fc.double({ min: 1, max: 100, noNaN: true }),
        (L, M) => {
          const r = splitPiece({ pieceLengthIn: L, maxSegmentLengthIn: M, stockThicknessIn: 0.125 });
          for (const s of r.segments) expect(s.lengthIn).toBeLessThanOrEqual(M + 1e-6);
        }
      )
    );
  });

  it('emits butt-gusset joints by default at each splice', () => {
    const r = splitPiece({ pieceLengthIn: 20, maxSegmentLengthIn: 8, stockThicknessIn: 0.125 });
    expect(r.joints.length).toBe(r.splicePositionsIn.length);
    expect(r.joints.length).toBe(r.segments.length - 1);
    for (const j of r.joints) {
      expect(j.kind).toBe('butt-gusset');
      expect(j.gussetLengthIn).toBeGreaterThan(0);
    }
  });

  it('joint=none suppresses joint emission', () => {
    const r = splitPiece({ pieceLengthIn: 20, maxSegmentLengthIn: 8, stockThicknessIn: 0.125, joint: 'none' });
    expect(r.splicePositionsIn.length).toBe(2);
    expect(r.joints.length).toBe(0);
  });

  it('snapToGrid pulls splices to the nearest preferred position', () => {
    const r = splitPiece({
      pieceLengthIn: 20,
      maxSegmentLengthIn: 8,
      stockThicknessIn: 0.125,
      strategy: 'snapToGrid',
      preferredPositionsIn: [0, 4, 8, 12, 16, 20],
    });
    for (const p of r.splicePositionsIn) {
      const dist = Math.min(...[0, 4, 8, 12, 16, 20].map((q) => Math.abs(q - p)));
      expect(dist).toBeLessThan(0.01);
    }
  });

  it('snapToGrid bumps segment count if snap would exceed maxLen', () => {
    const r = splitPiece({
      pieceLengthIn: 20,
      maxSegmentLengthIn: 8,
      stockThicknessIn: 0.125,
      strategy: 'snapToGrid',
      preferredPositionsIn: [0, 4, 8, 12, 16, 20],
    });
    for (const s of r.segments) expect(s.lengthIn).toBeLessThanOrEqual(8 + 1e-6);
  });

  it('staggerOffset shifts splice positions for layered members', () => {
    const a = splitPiece({ pieceLengthIn: 20, maxSegmentLengthIn: 8, stockThicknessIn: 0.125 });
    const b = splitPiece({ pieceLengthIn: 20, maxSegmentLengthIn: 8, stockThicknessIn: 0.125, staggerOffsetIn: 1 });
    for (let i = 0; i < a.splicePositionsIn.length; i++) {
      expect(a.splicePositionsIn[i]).not.toBeCloseTo(b.splicePositionsIn[i], 3);
    }
  });

  it('gussetWidthIn overrides the default (= memberDepthIn)', () => {
    const r = splitPiece({
      pieceLengthIn: 20,
      maxSegmentLengthIn: 8,
      stockThicknessIn: 0.125,
      memberDepthIn: 0.125,
      gussetWidthIn: 0.5,
    });
    for (const j of r.joints) expect(j.gussetWidthIn).toBeCloseTo(0.5, 6);
  });

  it('gussetLengthMultiplier scales the gusset length', () => {
    const r = splitPiece({
      pieceLengthIn: 20,
      maxSegmentLengthIn: 8,
      stockThicknessIn: 0.125,
      memberDepthIn: 0.2,
      gussetLengthMultiplier: 5,
    });
    for (const j of r.joints) expect(j.gussetLengthIn).toBeCloseTo(1.0, 6);
  });

  it('sum of segment lengths equals piece length', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 100, noNaN: true }),
        fc.double({ min: 1, max: 100, noNaN: true }),
        (L, M) => {
          const r = splitPiece({ pieceLengthIn: L, maxSegmentLengthIn: M, stockThicknessIn: 0.125 });
          const sum = r.segments.reduce((a, s) => a + s.lengthIn, 0);
          expect(sum).toBeCloseTo(L, 6);
        }
      )
    );
  });
});

function polygonArea(p: Polygon): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

describe('applyTenon', () => {
  it('inserts four new vertices into the polygon', () => {
    const square: Polygon = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const out = applyTenon(square, {
      insertAfterIndex: 1,
      widthIn: 2,
      lengthIn: 1,
      positionAlong: 0.5,
    });
    expect(out.length).toBe(8);
  });

  it('extends the polygon outward (away from interior centroid)', () => {
    const square: Polygon = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const out = applyTenon(square, {
      insertAfterIndex: 1,
      widthIn: 2,
      lengthIn: 1,
      positionAlong: 0.5,
    });
    const maxX = Math.max(...out.map(([x]) => x));
    expect(maxX).toBeCloseTo(11, 9);
  });

  it('tenon centered along the edge by default (positionAlong = 0.5)', () => {
    const square: Polygon = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const out = applyTenon(square, {
      insertAfterIndex: 1,
      widthIn: 2,
      lengthIn: 1,
      positionAlong: 0.5,
    });
    const tenonYs = out.slice(2, 6).map(([, y]) => y).sort((a, b) => a - b);
    expect(tenonYs[0]).toBeCloseTo(4, 9);
    expect(tenonYs[3]).toBeCloseTo(6, 9);
  });

  it('area grows by widthIn * lengthIn', () => {
    const square: Polygon = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const out = applyTenon(square, {
      insertAfterIndex: 1,
      widthIn: 2,
      lengthIn: 1,
      positionAlong: 0.5,
    });
    expect(polygonArea(out)).toBeCloseTo(102, 6);
  });
});

describe('applyMortise', () => {
  it('returns a PolygonWithHoles with one hole', () => {
    const square: Polygon = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const out = applyMortise(square, {
      centerIn: [5, 5],
      widthIn: 2,
      heightIn: 1,
    });
    expect(out.outline).toBe(square);
    expect(out.holes.length).toBe(1);
  });

  it('hole is a rectangle centered on centerIn', () => {
    const square: Polygon = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const out = applyMortise(square, {
      centerIn: [5, 5],
      widthIn: 2,
      heightIn: 1,
    });
    const hole = out.holes[0];
    expect(hole).toEqual([[4, 4.5], [6, 4.5], [6, 5.5], [4, 5.5]]);
  });

  it('appends a hole when called on an existing PolygonWithHoles', () => {
    const seed: PolygonWithHoles = {
      outline: [[0, 0], [10, 0], [10, 10], [0, 10]],
      holes: [[[1, 1], [2, 1], [2, 2], [1, 2]]],
    };
    const out = applyMortise(seed, {
      centerIn: [5, 5],
      widthIn: 2,
      heightIn: 1,
    });
    expect(out.holes.length).toBe(2);
  });
});
