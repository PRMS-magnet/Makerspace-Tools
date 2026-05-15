import type { Piece, Polygon } from '../core/types';
import type { FloorParams } from './types';
import { effectiveRimCutHeight } from './types';
import { computeFloorGeometry, computeJoistPositions } from './compute';
import { resolveBlockingRows } from './blocking';
import { rectanglePolygon } from './polygons';
import { splitPiece, type SpliceJoint } from '../core/joinery';

export interface FloorCutListResult {
  pieces: Piece[];
  warnings: string[];
}

const MARK_LINE_WIDTH_IN = 0.015;

function joistMarksOnSegment(
  joistPositionsIn: readonly number[],
  segStartX: number,
  segEndX: number,
  rimOffsetX: number,
  _joistThicknessIn: number,
  stockThicknessIn: number,
  rimCutHeightIn: number,
): Polygon[] {
  const marks: Polygon[] = [];
  const markVOffset = (rimCutHeightIn - stockThicknessIn) / 2;
  const w = MARK_LINE_WIDTH_IN;
  for (const xCenter of joistPositionsIn) {
    if (xCenter < segStartX - 1e-9 || xCenter > segEndX + 1e-9) continue;
    const localX = xCenter - segStartX + rimOffsetX - w / 2;
    marks.push([
      [localX, markVOffset],
      [localX + w, markVOffset],
      [localX + w, markVOffset + stockThicknessIn],
      [localX, markVOffset + stockThicknessIn],
    ]);
  }
  return marks;
}

function gussetPolygon(j: SpliceJoint): Polygon {
  return rectanglePolygon(j.gussetLengthIn, j.gussetWidthIn);
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
  const preferredSplices = joistPositions.map((x) => x + rimOverhang);
  const rimCutH = effectiveRimCutHeight(p.rimThicknessIn, p.stockThicknessIn);

  let firstSplitForWarning: ReturnType<typeof splitPiece> | null = null;

  for (const side of ['front', 'back'] as const) {
    const split = splitPiece({
      pieceLengthIn: rimTotalLen,
      maxSegmentLengthIn: p.maxPieceLengthIn,
      stockThicknessIn: p.stockThicknessIn,
      memberDepthIn: p.rimThicknessIn,
      gussetWidthIn: p.rimThicknessIn,
      strategy: 'snapToGrid',
      preferredPositionsIn: preferredSplices,
      joint: 'butt-gusset',
    });
    if (firstSplitForWarning === null) firstSplitForWarning = split;

    for (const seg of split.segments) {
      const segStartX = seg.startIn - rimOverhang;
      const segEndX = seg.endIn - rimOverhang;
      pieces.push({
        polygon: rectanglePolygon(seg.lengthIn, rimCutH),
        op: 'cut',
        label: `${side}-rim`,
        placement: { kind: 'floor-rim', floorId, side },
        engravedFeatures: joistMarksOnSegment(
          joistPositions,
          segStartX,
          segEndX,
          0,
          p.joistThicknessIn,
          p.stockThicknessIn,
          rimCutH,
        ),
      });
    }

    for (const j of split.joints) {
      pieces.push({
        polygon: gussetPolygon(j),
        op: 'cut',
        label: 'splice-gusset',
        placement: {
          kind: 'splice-gusset',
          hostKind: 'floor-rim',
          hostId: floorId,
          hostSubKey: side,
          positionAlongIn: j.positionIn - j.gussetLengthIn / 2,
          spliceFace: 'top',
        },
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

  if (rimTotalLen > p.maxPieceLengthIn && firstSplitForWarning) {
    const nSegs = firstSplitForWarning.segments.length;
    warnings.push(`Floor rim length ${rimTotalLen.toFixed(2)} in exceeds max piece length; rims split into ${nSegs} segments with ${firstSplitForWarning.joints.length} butt-gusset splice(s) per rim`);
  }

  return { pieces, warnings };
}
