import type { Piece, Sheet, PlacedPiece, LayoutResult, Polygon, PolygonWithHoles } from '../types';
import { isPolygonWithHoles } from '../types';
import { bbox } from '../polygon';

const EPS = 1e-6;

function outlineOf(poly: Polygon | PolygonWithHoles): Polygon {
  return isPolygonWithHoles(poly) ? poly.outline : poly;
}

export function bboxLayoutOnSheet(pieces: Piece[], sheet: Sheet): LayoutResult {
  const placed: PlacedPiece[] = [];
  const warnings: string[] = [];
  const margin = sheet.marginIn;
  const sheetWidth = sheet.widthIn;
  let currentY = margin;

  let i = 0;
  while (i < pieces.length) {
    const first = pieces[i];
    const firstBBox = bbox(outlineOf(first.polygon));
    const pieceW = firstBBox.width;
    const pieceH = firstBBox.height;

    if (pieceW > sheetWidth - 2 * margin) {
      warnings.push(
        `Piece ${first.label ?? `#${i}`} width ${pieceW.toFixed(2)}" exceeds sheet width minus margins`
      );
    }

    let groupEnd = i + 1;
    while (groupEnd < pieces.length) {
      const next = bbox(outlineOf(pieces[groupEnd].polygon));
      if (Math.abs(next.width - pieceW) > EPS || Math.abs(next.height - pieceH) > EPS) break;
      groupEnd++;
    }
    const groupCount = groupEnd - i;

    const perRow = Math.max(1, Math.floor((sheetWidth - margin) / (pieceW + margin)));

    for (let k = 0; k < groupCount; k++) {
      const row = Math.floor(k / perRow);
      const col = k % perRow;
      const offsetX = margin + col * (pieceW + margin) - firstBBox.minX;
      const offsetY = currentY + row * (pieceH + margin) - firstBBox.minY;
      placed.push({
        ...pieces[i + k],
        offsetIn: [offsetX, offsetY],
      });
    }

    const rows = Math.ceil(groupCount / perRow);
    currentY += rows * (pieceH + margin);
    i = groupEnd;
  }

  const totalHeightIn = currentY + margin;

  if (sheet.heightIn !== undefined && totalHeightIn > sheet.heightIn) {
    warnings.push(
      `Total height ${totalHeightIn.toFixed(2)}" exceeds sheet height ${sheet.heightIn}"`
    );
  }

  return { placed, totalHeightIn, warnings };
}
