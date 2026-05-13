import type { Piece, Sheet, PlacedPiece, Polygon, PolygonWithHoles } from './types';
import { isPolygonWithHoles } from './types';
import { bbox } from './polygon';
import { bboxLayoutOnSheet } from './packing/bbox-fallback';
import { composeRoofCutSvg } from '../roof';

const DEFAULT_SHEET_HEIGHT_IN = 18;
const DEFAULT_FIDUCIAL_SIZE_IN = 0.25;
const FIDUCIAL_INSET_IN = 0.05;

export interface SheetPack {
  cutSvg: string;
  sheetIndex: number;
  pieceCount: number;
  totalHeightIn: number;
}

export interface MultiSheetResult {
  sheets: SheetPack[];
  totalPieces: number;
  warnings: string[];
}

export interface PackIntoSheetsOptions {
  sheetHeightIn?: number;
  fiducialSizeIn?: number;
}

function outlineOf(poly: Polygon | PolygonWithHoles): Polygon {
  return isPolygonWithHoles(poly) ? poly.outline : poly;
}

function pieceHeight(p: PlacedPiece): number {
  return bbox(outlineOf(p.polygon)).height;
}

function fiducialTriangle(
  corner: 'TL' | 'TR' | 'BL' | 'BR',
  sheetW: number,
  sheetH: number,
  size: number,
): PlacedPiece {
  let cx = 0;
  let cy = 0;
  if (corner === 'TL') {
    cx = FIDUCIAL_INSET_IN;
    cy = FIDUCIAL_INSET_IN;
  } else if (corner === 'TR') {
    cx = sheetW - size - FIDUCIAL_INSET_IN;
    cy = FIDUCIAL_INSET_IN;
  } else if (corner === 'BL') {
    cx = FIDUCIAL_INSET_IN;
    cy = sheetH - size - FIDUCIAL_INSET_IN;
  } else {
    cx = sheetW - size - FIDUCIAL_INSET_IN;
    cy = sheetH - size - FIDUCIAL_INSET_IN;
  }
  const poly: Polygon = [
    [0, 0],
    [size, 0],
    [size / 2, size * 0.866],
  ];
  return {
    polygon: poly,
    op: 'cut',
    label: `fiducial-${corner}`,
    offsetIn: [cx, cy],
  };
}

function withSheetLabel(svg: string, sheetIndex: number, total: number, sheetH: number): string {
  const label = `Sheet ${sheetIndex + 1} of ${total}`;
  const labelEl = `  <text x="0.2" y="${(sheetH - 0.2).toFixed(3)}" font-size="0.2" fill="#000">${label}</text>\n`;
  return svg.replace('</svg>\n', `${labelEl}</svg>\n`);
}

export function packIntoSheets(
  pieces: Piece[],
  sheet: Sheet,
  opts?: PackIntoSheetsOptions,
): MultiSheetResult {
  const sheetH = opts?.sheetHeightIn ?? sheet.heightIn ?? DEFAULT_SHEET_HEIGHT_IN;
  const fSize = opts?.fiducialSizeIn ?? DEFAULT_FIDUCIAL_SIZE_IN;
  const warnings: string[] = [];

  if (pieces.length === 0) {
    return { sheets: [], totalPieces: 0, warnings: [] };
  }

  const layout = bboxLayoutOnSheet(pieces, sheet);
  warnings.push(...layout.warnings);

  const sortedPlaced = [...layout.placed].sort((a, b) => a.offsetIn[1] - b.offsetIn[1]);
  const usableHeight = sheetH - 2 * sheet.marginIn;

  const sheetsBuckets: PlacedPiece[][] = [[]];
  let currentSheetTopY = sortedPlaced.length > 0 ? sortedPlaced[0].offsetIn[1] : sheet.marginIn;

  for (const p of sortedPlaced) {
    const h = pieceHeight(p);
    const pTop = p.offsetIn[1];
    const pBottom = pTop + h;
    const localBottom = pBottom - currentSheetTopY + sheet.marginIn;

    if (sheetsBuckets[sheetsBuckets.length - 1].length > 0 && localBottom > usableHeight + sheet.marginIn) {
      sheetsBuckets.push([]);
      currentSheetTopY = pTop;
    }

    const shifted: PlacedPiece = {
      ...p,
      offsetIn: [p.offsetIn[0], p.offsetIn[1] - currentSheetTopY + sheet.marginIn],
    };
    sheetsBuckets[sheetsBuckets.length - 1].push(shifted);
  }

  const totalSheets = sheetsBuckets.length;
  const sheetPacks: SheetPack[] = sheetsBuckets.map((placedList, i) => {
    const maxY = placedList.reduce((m, pp) => {
      const h = pieceHeight(pp);
      return Math.max(m, pp.offsetIn[1] + h);
    }, 0);
    const contentTotalH = maxY + sheet.marginIn;
    const totalH = Math.max(contentTotalH, sheetH);

    const decorated: PlacedPiece[] = [
      ...placedList,
      fiducialTriangle('TL', sheet.widthIn, totalH, fSize),
      fiducialTriangle('TR', sheet.widthIn, totalH, fSize),
      fiducialTriangle('BL', sheet.widthIn, totalH, fSize),
      fiducialTriangle('BR', sheet.widthIn, totalH, fSize),
    ];

    let svg = composeRoofCutSvg(decorated, totalH, sheet.widthIn);
    svg = withSheetLabel(svg, i, totalSheets, totalH);

    return {
      cutSvg: svg,
      sheetIndex: i,
      pieceCount: placedList.length,
      totalHeightIn: totalH,
    };
  });

  return { sheets: sheetPacks, totalPieces: pieces.length, warnings };
}
