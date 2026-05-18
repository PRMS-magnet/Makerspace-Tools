import { describe, it, expect } from 'vitest';
import { resolveBlockingRows } from './blocking';

describe('resolveBlockingRows', () => {
  it('returns no rows for mode=none', () => {
    expect(resolveBlockingRows({ mode: 'none' }, 5, 10)).toEqual([]);
  });

  it('mode=half places one row per bay at positionFraction of span', () => {
    const rows = resolveBlockingRows({ mode: 'half', positionFraction: 0.5 }, 3, 10);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.positionFromEndCapAIn === 5)).toBe(true);
    expect(rows.every((r) => !r.spanFullLength)).toBe(true);
  });

  it('mode=staggered alternates dense/sparse counts per bay', () => {
    const rows = resolveBlockingRows(
      { mode: 'staggered', denseCount: 3, sparseCount: 2, startDense: true },
      4,
      12,
    );
    expect(rows).toHaveLength(3 + 2 + 3 + 2);
  });

  it('mode=custom with bayIndex=-1 spans full length per row', () => {
    const rows = resolveBlockingRows(
      { mode: 'custom', rows: [{ bayIndex: -1, positionFraction: 0.5 }] },
      3,
      10,
    );
    expect(rows.every((r) => r.spanFullLength)).toBe(true);
    expect(rows).toHaveLength(3);
  });

  it('mode=custom with specific bayIndex places single row in that bay only', () => {
    const rows = resolveBlockingRows(
      { mode: 'custom', rows: [{ bayIndex: 1, positionFraction: 0.25 }] },
      3,
      10,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].bayIndex).toBe(1);
    expect(rows[0].positionFromEndCapAIn).toBeCloseTo(2.5, 6);
    expect(rows[0].spanFullLength).toBe(false);
  });
});
