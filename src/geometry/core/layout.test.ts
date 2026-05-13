import { describe, it, expect } from 'vitest';
import type { Piece, Sheet, Polygon } from './types';
import { layoutOnSheet } from './layout';

function rect(w: number, h: number): Polygon {
  return [[0, 0], [w, 0], [w, h], [0, h]];
}

function piece(w: number, h: number, label: string): Piece {
  return { polygon: rect(w, h), op: 'cut', label };
}

const sheet12: Sheet = { widthIn: 12, marginIn: 0.12 };

describe('layoutOnSheet', () => {
  it('places a single piece at the top-left with margin offset', () => {
    const r = layoutOnSheet([piece(2, 1, 'a')], sheet12);
    expect(r.placed).toHaveLength(1);
    expect(r.placed[0].offsetIn[0]).toBeCloseTo(0.12, 6);
    expect(r.placed[0].offsetIn[1]).toBeCloseTo(0.12, 6);
    expect(r.warnings).toEqual([]);
  });

  it('tiles same-size pieces left-to-right then top-to-bottom', () => {
    const r = layoutOnSheet([piece(5, 1, 'a'), piece(5, 1, 'b'), piece(5, 1, 'c')], sheet12);
    expect(r.placed).toHaveLength(3);
    expect(r.placed[0].offsetIn[1]).toBeCloseTo(r.placed[1].offsetIn[1], 6);
    expect(r.placed[2].offsetIn[1]).toBeGreaterThan(r.placed[0].offsetIn[1] + 1);
  });

  it('totalHeightIn matches the Python convention: top margin + n_rows * (h + row gap) + bottom margin', () => {
    const r = layoutOnSheet([piece(2, 1, 'a')], sheet12);
    expect(r.totalHeightIn).toBeCloseTo(0.12 + (1 + 0.12) + 0.12, 6);
  });

  it('starts a new row for a piece of different dimensions', () => {
    const pieces = [piece(2, 1, 'small'), piece(8, 2, 'big')];
    const r = layoutOnSheet(pieces, sheet12);
    expect(r.placed).toHaveLength(2);
    expect(r.placed[1].offsetIn[1]).toBeGreaterThan(r.placed[0].offsetIn[1] + 1);
  });

  it('warns when a piece is wider than the sheet minus margins', () => {
    const r = layoutOnSheet([piece(15, 1, 'too-wide')], sheet12);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain('too-wide');
  });

  it('warns when totalHeight exceeds bounded sheet height', () => {
    const boundedSheet: Sheet = { widthIn: 12, heightIn: 1, marginIn: 0.12 };
    const r = layoutOnSheet(Array.from({ length: 6 }, (_, i) => piece(2, 1, `r${i}`)), boundedSheet);
    expect(r.warnings.some((w) => w.includes('height'))).toBe(true);
  });

  it('preserves piece labels and ops', () => {
    const r = layoutOnSheet([piece(2, 1, 'rafter')], sheet12);
    expect(r.placed[0].label).toBe('rafter');
    expect(r.placed[0].op).toBe('cut');
  });
});
