import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Vec2, Polygon } from './types';
import { translate, mirror, bbox, installedToFlat } from './polygon';

const arbNum = fc.double({ min: -1e4, max: 1e4, noNaN: true });
const arbVec2 = fc.tuple(arbNum, arbNum) as fc.Arbitrary<Vec2>;
const arbPolygon = fc.array(arbVec2, { minLength: 3, maxLength: 12 }) as fc.Arbitrary<Polygon>;

describe('polygon.translate', () => {
  it('shifts every vertex by the same vector', () => {
    fc.assert(fc.property(arbPolygon, arbVec2, (p, v) => {
      const t = translate(p, v);
      expect(t.length).toBe(p.length);
      for (let i = 0; i < p.length; i++) {
        expect(t[i][0]).toBeCloseTo(p[i][0] + v[0], 9);
        expect(t[i][1]).toBeCloseTo(p[i][1] + v[1], 9);
      }
    }));
  });

  it('translate by (0,0) is identity', () => {
    fc.assert(fc.property(arbPolygon, (p) => {
      const t = translate(p, [0, 0]);
      for (let i = 0; i < p.length; i++) {
        expect(t[i][0]).toBeCloseTo(p[i][0], 9);
        expect(t[i][1]).toBeCloseTo(p[i][1], 9);
      }
    }));
  });

  it('translate then translate by negative is identity', () => {
    fc.assert(fc.property(arbPolygon, arbVec2, (p, v) => {
      const back = translate(translate(p, v), [-v[0], -v[1]]);
      for (let i = 0; i < p.length; i++) {
        expect(back[i][0]).toBeCloseTo(p[i][0], 6);
        expect(back[i][1]).toBeCloseTo(p[i][1], 6);
      }
    }));
  });
});

describe('polygon.mirror', () => {
  it('flips x around the axis, preserves y', () => {
    const p: Polygon = [[1, 5], [3, 7], [4, 6]];
    const m = mirror(p, 2);
    expect(m).toEqual([[3, 5], [1, 7], [0, 6]]);
  });

  it('mirroring twice around the same axis is identity', () => {
    fc.assert(fc.property(arbPolygon, arbNum, (p, axis) => {
      const back = mirror(mirror(p, axis), axis);
      for (let i = 0; i < p.length; i++) {
        expect(back[i][0]).toBeCloseTo(p[i][0], 9);
        expect(back[i][1]).toBe(p[i][1]);
      }
    }));
  });
});

describe('polygon.bbox', () => {
  it('contains every vertex', () => {
    fc.assert(fc.property(arbPolygon, (p) => {
      const b = bbox(p);
      for (const [x, y] of p) {
        expect(x).toBeGreaterThanOrEqual(b.minX);
        expect(x).toBeLessThanOrEqual(b.maxX);
        expect(y).toBeGreaterThanOrEqual(b.minY);
        expect(y).toBeLessThanOrEqual(b.maxY);
      }
    }));
  });

  it('width and height are non-negative and consistent', () => {
    fc.assert(fc.property(arbPolygon, (p) => {
      const b = bbox(p);
      expect(b.width).toBeGreaterThanOrEqual(0);
      expect(b.height).toBeGreaterThanOrEqual(0);
      expect(b.width).toBeCloseTo(b.maxX - b.minX, 9);
      expect(b.height).toBeCloseTo(b.maxY - b.minY, 9);
    }));
  });

  it('matches a hand example', () => {
    const p: Polygon = [[1, 2], [5, 2], [3, 4]];
    const b = bbox(p);
    expect(b).toEqual({ minX: 1, minY: 2, maxX: 5, maxY: 4, width: 4, height: 2 });
  });
});

describe('polygon.installedToFlat', () => {
  it('result bbox starts at (0, 0)', () => {
    fc.assert(fc.property(arbPolygon, (p) => {
      const flat = installedToFlat(p);
      const b = bbox(flat);
      expect(b.minX).toBeCloseTo(0, 9);
      expect(b.minY).toBeCloseTo(0, 9);
    }));
  });

  it('flips y axis (math up to SVG down)', () => {
    const p: Polygon = [[0, 0], [2, 0], [1, 1]];
    const flat = installedToFlat(p);
    expect(flat[0][1]).toBeCloseTo(1, 9);
    expect(flat[1][1]).toBeCloseTo(1, 9);
    expect(flat[2][1]).toBeCloseTo(0, 9);
  });

  it('preserves polygon point count', () => {
    fc.assert(fc.property(arbPolygon, (p) => {
      expect(installedToFlat(p).length).toBe(p.length);
    }));
  });
});
