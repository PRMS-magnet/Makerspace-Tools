import { describe, it, expect } from 'vitest';
import { resolveBlockingRows } from './blocking';
import type { BlockingSpec } from './types';

describe('resolveBlockingRows', () => {
  it('returns no rows for mode none', () => {
    expect(resolveBlockingRows({ mode: 'none' }, 5, 6).length).toBe(0);
  });

  it('emits one row per bay for mode half', () => {
    const rows = resolveBlockingRows({ mode: 'half', positionFraction: 0.5 }, 5, 6);
    expect(rows.length).toBe(5);
    for (const r of rows) {
      expect(r.distanceFromFrontRimIn).toBeCloseTo(3, 6);
      expect(r.spanFullWidth).toBe(false);
    }
  });

  it('staggers dense/sparse counts across bays', () => {
    const spec: BlockingSpec = { mode: 'staggered', denseCount: 3, sparseCount: 2, startDense: true };
    const rows = resolveBlockingRows(spec, 4, 6);
    expect(rows.length).toBe(3 + 2 + 3 + 2);
  });

  it('honors custom rows with per-bay placement', () => {
    const spec: BlockingSpec = {
      mode: 'custom',
      rows: [{ bayIndex: 1, positionFraction: 0.3 }, { bayIndex: 2, positionFraction: 0.7 }],
    };
    const rows = resolveBlockingRows(spec, 5, 6);
    expect(rows.length).toBe(2);
    expect(rows[0].bayIndex).toBe(1);
    expect(rows[0].distanceFromFrontRimIn).toBeCloseTo(0.3 * 6, 6);
    expect(rows[1].bayIndex).toBe(2);
    expect(rows[1].distanceFromFrontRimIn).toBeCloseTo(0.7 * 6, 6);
  });

  it('expands bayIndex -1 to a full-width row in every bay', () => {
    const spec: BlockingSpec = {
      mode: 'custom',
      rows: [{ bayIndex: -1, positionFraction: 0.5 }],
    };
    const rows = resolveBlockingRows(spec, 4, 6);
    expect(rows.length).toBe(4);
    for (const r of rows) expect(r.spanFullWidth).toBe(true);
  });
});
