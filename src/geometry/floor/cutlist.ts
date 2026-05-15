import type { Piece, Polygon } from '../core/types';
import type { FloorParams } from './types';
import { effectiveRimCutHeight } from './types';
import { computeFloorGeometry, computeJoistPositions } from './compute';
import { resolveBlockingRows } from './blocking';
import { rectanglePolygon } from './polygons';

export interface FloorCutListResult {
  pieces: Piece[];
  warnings: string[];
}

function joistMarksOnSegment(
  joistPositionsIn: readonly number[],
  segStartX: number,
  segEndX: number,
  rimOffsetX: number,
  joistThicknessIn: number,
  stockThicknessIn: number,
  rimCutHeightIn: number,
): Polygon[] {
  const marks: Polygon[] = [];
  const markVOffset = (rimCutHeightIn - stockThicknessIn) / 2;
  for (const xCenter of joistPositionsIn) {
    if (xCenter < segStartX - 1e-9 || xCenter > segEndX + 1e-9) continue;
    const localX = xCenter - segStartX + rimOffsetX - joistThicknessIn / 2;
    marks.push([
      [localX, markVOffset],
      [localX + joistThicknessIn, markVOffset],
      [localX + joistThicknessIn, markVOffset + stockThicknessIn],
      [localX, markVOffset + stockThicknessIn],
    ]);
  }
  return marks;
}

export function buildFloorCutListPieces(p: FloorParams, floorId: string): FloorCutListResult {
  const pieces: Piece[] = [];
  const warnings: string[] = [];

  const geom = computeFloorGeometry(p);
  const joistPositions = computeJoistPositions(p);
  const nJoists = joistPositions.length;
  const nBays = Math.max(0, nJoists - 1);
  const rows = resolveBlockingRows(p.blocking, nBays, geom.interRimDepthIn);

  const rimOverhang = p.joistThicknessIn / 2;
  const rimTotalLen = p.widthIn + p.joistThicknessIn;
  const nRimSegs = Math.max(1, Math.ceil(rimTotalLen / p.maxPieceLengthIn));
  const rimSegLen = rimTotalLen / nRimSegs;

  const rimCutH = effectiveRimCutHeight(p.rimThicknessIn, p.stockThicknessIn);

  for (const side of ['front', 'back'] as const) {
    for (let s = 0; s < nRimSegs; s++) {
      const segStart = s * rimSegLen - rimOverhang;
      const segEnd = segStart + rimSegLen;
      pieces.push({
        polygon: rectanglePolygon(rimSegLen, rimCutH),
        op: 'cut',
        label: `${side}-rim`,
        placement: { kind: 'floor-rim', floorId, side },
        engravedFeatures: joistMarksOnSegment(
          joistPositions,
          segStart,
          segEnd,
          0,
          p.joistThicknessIn,
          p.stockThicknessIn,
          rimCutH,
        ),
      });
    }
  }

  for (let i = 0; i < nJoists; i++) {
    pieces.push({
      polygon: rectanglePolygon(p.joistThicknessIn, geom.interRimDepthIn),
      op: 'cut',
      label: 'joist',
      placement: { kind: 'floor-joist', floorId, indexAlongWidth: i },
    });
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const w = row.spanFullWidth ? p.widthIn : geom.bayWidthIn;
    pieces.push({
      polygon: rectanglePolygon(w, p.blockingThicknessIn),
      op: 'cut',
      label: 'block',
      placement: { kind: 'floor-block', floorId, bayIndex: row.bayIndex, rowIndex: r },
    });
  }

  if (rimTotalLen > p.maxPieceLengthIn) {
    warnings.push(`Floor rim length ${rimTotalLen.toFixed(2)} in exceeds max piece length; rims split into ${nRimSegs} segments`);
  }

  return { pieces, warnings };
}
