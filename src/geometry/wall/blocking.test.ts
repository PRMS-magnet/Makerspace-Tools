import { describe, it, expect } from 'vitest';
import { resolveBlockingRows } from './blocking';

describe('resolveBlockingRows', () => {
  it('none mode emits zero rows', () => {
    const rows = resolveBlockingRows({ mode: 'none' }, 4, 4.0);
    expect(rows).toEqual([]);
  });

  it('half mode emits one row per bay at fraction * height', () => {
    const rows = resolveBlockingRows({ mode: 'half', heightFraction: 0.5 }, 3, 4.0);
    expect(rows.length).toBe(3);
    expect(rows.every((r) => r.heightFromBottomPlateIn === 2.0)).toBe(true);
    expect(rows.map((r) => r.bayIndex).sort()).toEqual([0, 1, 2]);
    expect(rows.every((r) => r.spanFullWidth === false)).toBe(true);
  });

  it('staggered 3-2-3 pattern with denseCount=3, sparseCount=2, startDense=true', () => {
    const rows = resolveBlockingRows(
      { mode: 'staggered', denseCount: 3, sparseCount: 2, startDense: true },
      3,
      4.0,
    );
    const bay0 = rows.filter((r) => r.bayIndex === 0);
    const bay1 = rows.filter((r) => r.bayIndex === 1);
    const bay2 = rows.filter((r) => r.bayIndex === 2);
    expect(bay0.length).toBe(3);
    expect(bay1.length).toBe(2);
    expect(bay2.length).toBe(3);
    expect(bay0.map((r) => r.heightFromBottomPlateIn)).toEqual([1.0, 2.0, 3.0]);
    expect(bay1.map((r) => r.heightFromBottomPlateIn).map((h) => Math.round(h * 1000) / 1000)).toEqual([
      Math.round((4.0 / 3) * 1000) / 1000,
      Math.round((8.0 / 3) * 1000) / 1000,
    ]);
  });

  it('staggered with startDense=false swaps the pattern', () => {
    const rows = resolveBlockingRows(
      { mode: 'staggered', denseCount: 3, sparseCount: 2, startDense: false },
      3,
      4.0,
    );
    expect(rows.filter((r) => r.bayIndex === 0).length).toBe(2);
    expect(rows.filter((r) => r.bayIndex === 1).length).toBe(3);
  });

  it('staggered with both counts = 1 collapses to one row per bay (real fire-blocking)', () => {
    const rows = resolveBlockingRows(
      { mode: 'staggered', denseCount: 1, sparseCount: 1, startDense: true },
      4,
      4.0,
    );
    expect(rows.length).toBe(4);
    expect(rows.every((r) => r.heightFromBottomPlateIn === 2.0)).toBe(true);
  });

  it('custom mode with bayIndex >= 0 emits per-bay row', () => {
    const rows = resolveBlockingRows(
      { mode: 'custom', rows: [{ bayIndex: 1, heightFraction: 0.5 }] },
      3,
      4.0,
    );
    expect(rows).toEqual([{ bayIndex: 1, heightFromBottomPlateIn: 2.0, spanFullWidth: false }]);
  });

  it('custom mode with bayIndex < 0 emits one row per bay marked spanFullWidth', () => {
    const rows = resolveBlockingRows(
      { mode: 'custom', rows: [{ bayIndex: -1, heightFraction: 0.5 }] },
      3,
      4.0,
    );
    expect(rows.length).toBe(3);
    expect(rows.every((r) => r.spanFullWidth)).toBe(true);
  });
});
