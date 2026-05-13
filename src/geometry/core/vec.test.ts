import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Vec2 } from './types';
import { add, sub, scale, rotate, eq } from './vec';

const arbNum = fc.double({ min: -1e6, max: 1e6, noNaN: true });
const arbVec2 = fc.tuple(arbNum, arbNum) as fc.Arbitrary<Vec2>;
const arbAngle = fc.double({ min: -Math.PI * 4, max: Math.PI * 4, noNaN: true });

describe('vec.add', () => {
  it('is commutative', () => {
    fc.assert(fc.property(arbVec2, arbVec2, (a, b) => {
      expect(eq(add(a, b), add(b, a))).toBe(true);
    }));
  });

  it('has zero identity', () => {
    fc.assert(fc.property(arbVec2, (a) => {
      expect(eq(add(a, [0, 0]), a)).toBe(true);
    }));
  });
});

describe('vec.sub', () => {
  it('is inverse of add', () => {
    fc.assert(fc.property(arbVec2, arbVec2, (a, b) => {
      expect(eq(sub(add(a, b), b), a, 1e-6)).toBe(true);
    }));
  });

  it('a - a is zero', () => {
    fc.assert(fc.property(arbVec2, (a) => {
      expect(eq(sub(a, a), [0, 0])).toBe(true);
    }));
  });
});

describe('vec.scale', () => {
  it('by 1 is identity', () => {
    fc.assert(fc.property(arbVec2, (a) => {
      expect(eq(scale(a, 1), a)).toBe(true);
    }));
  });

  it('by 0 is zero', () => {
    fc.assert(fc.property(arbVec2, (a) => {
      expect(eq(scale(a, 0), [0, 0])).toBe(true);
    }));
  });
});

describe('vec.rotate', () => {
  it('by 0 is identity', () => {
    fc.assert(fc.property(arbVec2, (a) => {
      expect(eq(rotate(a, 0), a, 1e-9)).toBe(true);
    }));
  });

  it('by 2*PI is identity (within float epsilon)', () => {
    fc.assert(fc.property(arbVec2, (a) => {
      expect(eq(rotate(a, 2 * Math.PI), a, 1e-6)).toBe(true);
    }));
  });

  it('preserves length', () => {
    fc.assert(fc.property(arbVec2, arbAngle, (a, theta) => {
      const r = rotate(a, theta);
      const lenA = Math.hypot(a[0], a[1]);
      const lenR = Math.hypot(r[0], r[1]);
      expect(Math.abs(lenA - lenR)).toBeLessThan(1e-6 + Math.abs(lenA) * 1e-9);
    }));
  });
});

describe('vec.eq', () => {
  it('matches identical vectors', () => {
    expect(eq([1, 2], [1, 2])).toBe(true);
  });

  it('rejects clearly different vectors', () => {
    expect(eq([1, 2], [1.1, 2])).toBe(false);
  });

  it('respects custom epsilon', () => {
    expect(eq([1, 2], [1.0001, 2.0001], 1e-3)).toBe(true);
    expect(eq([1, 2], [1.0001, 2.0001], 1e-6)).toBe(false);
  });
});
