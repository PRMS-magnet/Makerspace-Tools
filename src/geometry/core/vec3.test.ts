import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Vec3 } from './vec3';
import { add3, sub3, scale3, dot3, cross3, length3, normalize3, eq3 } from './vec3';

const arbNum = fc.double({ min: -1e4, max: 1e4, noNaN: true });
const arbVec3 = fc.tuple(arbNum, arbNum, arbNum) as fc.Arbitrary<Vec3>;

describe('vec3.add3', () => {
  it('is commutative', () => {
    fc.assert(fc.property(arbVec3, arbVec3, (a, b) => {
      expect(eq3(add3(a, b), add3(b, a), 1e-6)).toBe(true);
    }));
  });

  it('has zero identity', () => {
    fc.assert(fc.property(arbVec3, (a) => {
      expect(eq3(add3(a, [0, 0, 0]), a, 1e-9)).toBe(true);
    }));
  });
});

describe('vec3.sub3', () => {
  it('a - a is zero', () => {
    fc.assert(fc.property(arbVec3, (a) => {
      expect(eq3(sub3(a, a), [0, 0, 0])).toBe(true);
    }));
  });

  it('is inverse of add3', () => {
    fc.assert(fc.property(arbVec3, arbVec3, (a, b) => {
      expect(eq3(sub3(add3(a, b), b), a, 1e-6)).toBe(true);
    }));
  });
});

describe('vec3.scale3', () => {
  it('by 1 is identity', () => {
    fc.assert(fc.property(arbVec3, (a) => {
      expect(eq3(scale3(a, 1), a)).toBe(true);
    }));
  });

  it('by 0 is zero', () => {
    fc.assert(fc.property(arbVec3, (a) => {
      expect(eq3(scale3(a, 0), [0, 0, 0])).toBe(true);
    }));
  });
});

describe('vec3.dot3', () => {
  it('matches a hand example', () => {
    expect(dot3([1, 2, 3], [4, -5, 6])).toBe(4 - 10 + 18);
  });

  it('is commutative', () => {
    fc.assert(fc.property(arbVec3, arbVec3, (a, b) => {
      expect(Math.abs(dot3(a, b) - dot3(b, a))).toBeLessThan(1e-6 * (1 + Math.abs(dot3(a, b))));
    }));
  });

  it('dot(a, a) === length²', () => {
    fc.assert(fc.property(arbVec3, (a) => {
      const lenSq = length3(a) ** 2;
      const dot = dot3(a, a);
      expect(Math.abs(dot - lenSq)).toBeLessThan(1e-3 + lenSq * 1e-9);
    }));
  });
});

describe('vec3.cross3', () => {
  it('matches a hand example (right-hand rule: X × Y = Z)', () => {
    expect(cross3([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(cross3([0, 1, 0], [0, 0, 1])).toEqual([1, 0, 0]);
    expect(cross3([0, 0, 1], [1, 0, 0])).toEqual([0, 1, 0]);
  });

  it('is anti-commutative: a × b = -(b × a)', () => {
    fc.assert(fc.property(arbVec3, arbVec3, (a, b) => {
      const ab = cross3(a, b);
      const ba = cross3(b, a);
      expect(eq3(ab, [-ba[0], -ba[1], -ba[2]], 1e-6)).toBe(true);
    }));
  });

  it('result is perpendicular to both inputs', () => {
    fc.assert(fc.property(arbVec3, arbVec3, (a, b) => {
      const c = cross3(a, b);
      const lenSq = dot3(a, a) * dot3(b, b);
      const tol = 1e-3 + lenSq * 1e-9;
      expect(Math.abs(dot3(a, c))).toBeLessThan(tol);
      expect(Math.abs(dot3(b, c))).toBeLessThan(tol);
    }));
  });

  it('cross of parallel vectors is zero', () => {
    fc.assert(fc.property(arbVec3, arbNum, (a, k) => {
      const parallel: Vec3 = [a[0] * k, a[1] * k, a[2] * k];
      expect(eq3(cross3(a, parallel), [0, 0, 0], 1e-3)).toBe(true);
    }));
  });
});

describe('vec3.length3 and normalize3', () => {
  it('length of (3,4,12) is 13', () => {
    expect(length3([3, 4, 12])).toBeCloseTo(13, 9);
  });

  it('normalize gives unit length (or zero for near-zero vec)', () => {
    fc.assert(fc.property(arbVec3, (a) => {
      const n = normalize3(a);
      const len = length3(n);
      if (length3(a) < 1e-12) {
        expect(len).toBe(0);
      } else {
        expect(Math.abs(len - 1)).toBeLessThan(1e-6);
      }
    }));
  });

  it('normalize preserves direction', () => {
    fc.assert(fc.property(arbVec3, (a) => {
      if (length3(a) < 1e-6) return;
      const n = normalize3(a);
      const c = cross3(a, n);
      expect(length3(c)).toBeLessThan(1e-3);
    }));
  });
});

describe('vec3.eq3', () => {
  it('matches identical vectors', () => {
    expect(eq3([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('rejects different vectors', () => {
    expect(eq3([1, 2, 3], [1, 2, 3.1])).toBe(false);
  });

  it('respects custom epsilon', () => {
    expect(eq3([1, 2, 3], [1.0001, 2.0001, 3.0001], 1e-3)).toBe(true);
    expect(eq3([1, 2, 3], [1.0001, 2.0001, 3.0001], 1e-6)).toBe(false);
  });
});
