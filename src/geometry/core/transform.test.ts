import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Vec2, Polygon } from './types';
import { transformPoint, transformPolygon } from './transform';

const arbNum = fc.double({ min: -1e4, max: 1e4, noNaN: true });
const arbVec2 = fc.tuple(arbNum, arbNum) as fc.Arbitrary<Vec2>;
const arbPolygon = fc.array(arbVec2, { minLength: 3, maxLength: 8 }) as fc.Arbitrary<Polygon>;
const arbAngle = fc.double({ min: -Math.PI * 2, max: Math.PI * 2, noNaN: true });

describe('transformPoint', () => {
  it('no options is identity', () => {
    fc.assert(fc.property(arbVec2, (p) => {
      const t = transformPoint(p, {});
      expect(t[0]).toBe(p[0]);
      expect(t[1]).toBe(p[1]);
    }));
  });

  it('translate-only moves by the vector', () => {
    fc.assert(fc.property(arbVec2, arbVec2, (p, v) => {
      const t = transformPoint(p, { translate: v });
      expect(t[0]).toBeCloseTo(p[0] + v[0], 9);
      expect(t[1]).toBeCloseTo(p[1] + v[1], 9);
    }));
  });

  it('scale-uniform multiplies both components', () => {
    fc.assert(fc.property(arbVec2, arbNum, (p, k) => {
      const t = transformPoint(p, { scale: k });
      expect(t[0]).toBeCloseTo(p[0] * k, 6);
      expect(t[1]).toBeCloseTo(p[1] * k, 6);
    }));
  });

  it('scale-nonuniform multiplies each component independently', () => {
    fc.assert(fc.property(arbVec2, arbNum, arbNum, (p, sx, sy) => {
      const t = transformPoint(p, { scale: [sx, sy] });
      expect(t[0]).toBeCloseTo(p[0] * sx, 6);
      expect(t[1]).toBeCloseTo(p[1] * sy, 6);
    }));
  });

  it('rotate by 0 is identity', () => {
    fc.assert(fc.property(arbVec2, (p) => {
      const t = transformPoint(p, { rotate: 0 });
      expect(t[0]).toBeCloseTo(p[0], 9);
      expect(t[1]).toBeCloseTo(p[1], 9);
    }));
  });

  it('order is scale, rotate, translate', () => {
    const t = transformPoint([1, 0], { scale: 2, rotate: Math.PI / 2, translate: [10, 0] });
    expect(t[0]).toBeCloseTo(10, 6);
    expect(t[1]).toBeCloseTo(2, 6);
  });
});

describe('transformPolygon', () => {
  it('applies transform to every vertex', () => {
    fc.assert(fc.property(arbPolygon, arbVec2, (p, v) => {
      const t = transformPolygon(p, { translate: v });
      expect(t.length).toBe(p.length);
      for (let i = 0; i < p.length; i++) {
        expect(t[i][0]).toBeCloseTo(p[i][0] + v[0], 9);
        expect(t[i][1]).toBeCloseTo(p[i][1] + v[1], 9);
      }
    }));
  });

  it('preserves vertex count under rotation', () => {
    fc.assert(fc.property(arbPolygon, arbAngle, (p, theta) => {
      expect(transformPolygon(p, { rotate: theta }).length).toBe(p.length);
    }));
  });
});
