import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { inToMm, mmToIn, formatIn } from './units';

describe('inToMm', () => {
  it('1 inch is 25.4 mm', () => {
    expect(inToMm(1)).toBe(25.4);
  });

  it('0 inches is 0 mm', () => {
    expect(inToMm(0)).toBe(0);
  });

  it('negative inches yield negative mm', () => {
    expect(inToMm(-2)).toBeCloseTo(-50.8, 9);
  });
});

describe('mmToIn', () => {
  it('25.4 mm is 1 inch', () => {
    expect(mmToIn(25.4)).toBeCloseTo(1, 9);
  });

  it('is inverse of inToMm', () => {
    fc.assert(fc.property(fc.double({ min: -1e4, max: 1e4, noNaN: true }), (n) => {
      expect(mmToIn(inToMm(n))).toBeCloseTo(n, 6);
    }));
  });
});

describe('formatIn', () => {
  it('formats to default 3 decimal places with double-prime', () => {
    expect(formatIn(8.75)).toBe('8.750″');
  });

  it('respects custom places', () => {
    expect(formatIn(8.75, 1)).toBe('8.8″');
    expect(formatIn(8.75, 0)).toBe('9″');
  });

  it('handles zero', () => {
    expect(formatIn(0)).toBe('0.000″');
  });
});
