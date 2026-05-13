import { describe, it, expect } from 'vitest';
import { packIntoSheets } from './multi-sheet';
import type { Piece, Sheet } from './types';

function makeSquare(side: number, label: string): Piece {
  return {
    polygon: [
      [0, 0],
      [side, 0],
      [side, side],
      [0, side],
    ],
    op: 'cut',
    label,
  };
}

const SHEET: Sheet = { widthIn: 12, marginIn: 0.1 };

describe('packIntoSheets', () => {
  it('returns one sheet when pieces fit', () => {
    const pieces = [makeSquare(2, 'a'), makeSquare(2, 'b'), makeSquare(2, 'c')];
    const result = packIntoSheets(pieces, SHEET, { sheetHeightIn: 18 });
    expect(result.sheets.length).toBe(1);
    expect(result.totalPieces).toBe(3);
  });

  it('returns multiple sheets when pieces overflow', () => {
    const big = Array.from({ length: 30 }, (_, i) => makeSquare(2.5, `p${i}`));
    const result = packIntoSheets(big, SHEET, { sheetHeightIn: 6 });
    expect(result.sheets.length).toBeGreaterThan(1);
    expect(result.totalPieces).toBe(30);
  });

  it('every sheet returns valid SVG', () => {
    const big = Array.from({ length: 20 }, (_, i) => makeSquare(2.5, `p${i}`));
    const result = packIntoSheets(big, SHEET, { sheetHeightIn: 6 });
    for (const s of result.sheets) {
      expect(s.cutSvg).toMatch(/^<\?xml/);
      expect(s.cutSvg).toMatch(/<\/svg>\s*$/);
    }
  });

  it('embeds sheet index label in each sheet', () => {
    const big = Array.from({ length: 20 }, (_, i) => makeSquare(2.5, `p${i}`));
    const result = packIntoSheets(big, SHEET, { sheetHeightIn: 6 });
    result.sheets.forEach((s, i) => {
      expect(s.cutSvg).toContain(`Sheet ${i + 1} of ${result.sheets.length}`);
    });
  });

  it('reports total piece count', () => {
    const pieces = Array.from({ length: 15 }, (_, i) => makeSquare(1, `p${i}`));
    const result = packIntoSheets(pieces, SHEET, { sheetHeightIn: 18 });
    expect(result.totalPieces).toBe(15);
  });
});
