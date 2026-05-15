import type { Piece, Polygon } from '../core/types';
import type { WallParams } from './types';
import { effectivePlateCutHeight } from './types';
import { computeWallGeometry, computeStudPositions } from './compute';
import { resolveBlockingRows } from './blocking';
import { rectanglePolygon } from './polygons';
import { splitPiece, type SpliceJoint } from '../core/joinery';

export interface WallCutListResult {
  pieces: Piece[];
  warnings: string[];
}

function studMarksOnSegment(
  studPositionsIn: readonly number[],
  segStartX: number,
  segEndX: number,
  plateOffsetX: number,
  studWidthIn: number,
  stockThicknessIn: number,
  plateCutHeightIn: number,
): Polygon[] {
  const marks: Polygon[] = [];
  const markVOffset = (plateCutHeightIn - stockThicknessIn) / 2;
  for (const xCenter of studPositionsIn) {
    if (xCenter < segStartX - 1e-9 || xCenter > segEndX + 1e-9) continue;
    const localX = xCenter - segStartX + plateOffsetX - studWidthIn / 2;
    marks.push([
      [localX, markVOffset],
      [localX + studWidthIn, markVOffset],
      [localX + studWidthIn, markVOffset + stockThicknessIn],
      [localX, markVOffset + stockThicknessIn],
    ]);
  }
  return marks;
}

function gussetPolygon(j: SpliceJoint): Polygon {
  return rectanglePolygon(j.gussetLengthIn, j.gussetWidthIn);
}

export function buildWallCutListPieces(p: WallParams, wallId: string): WallCutListResult {
  const pieces: Piece[] = [];
  const warnings: string[] = [];

  const geom = computeWallGeometry(p);
  const studPositions = computeStudPositions(p);
  const nStuds = studPositions.length;
  const nBays = Math.max(0, nStuds - 1);
  const rows = resolveBlockingRows(p.blocking, nBays, geom.interPlateHeightIn);

  const plateOverhang = p.studWidthIn / 2;
  const plateTotalLen = p.widthIn + p.studWidthIn;
  const preferredSplices = studPositions.map((x) => x + plateOverhang);

  const bottomCutH = effectivePlateCutHeight(p.bottomPlateHeightIn, p.stockThicknessIn);
  const topCutH = effectivePlateCutHeight(p.topPlateHeightIn, p.stockThicknessIn);

  const bottomSplit = splitPiece({
    pieceLengthIn: plateTotalLen,
    maxSegmentLengthIn: p.maxPieceLengthIn,
    stockThicknessIn: p.stockThicknessIn,
    memberDepthIn: p.bottomPlateHeightIn,
    gussetWidthIn: p.studDepthIn,
    strategy: 'snapToGrid',
    preferredPositionsIn: preferredSplices,
    joint: 'butt-gusset',
  });

  for (const seg of bottomSplit.segments) {
    const segStartX = seg.startIn - plateOverhang;
    const segEndX = seg.endIn - plateOverhang;
    pieces.push({
      polygon: rectanglePolygon(seg.lengthIn, bottomCutH),
      op: 'cut',
      label: 'bottom-plate',
      placement: { kind: 'wall-bottom-plate', wallId },
      engravedFeatures: studMarksOnSegment(studPositions, segStartX, segEndX, 0, p.studWidthIn, p.stockThicknessIn, bottomCutH),
    });
  }

  for (const j of bottomSplit.joints) {
    pieces.push({
      polygon: gussetPolygon(j),
      op: 'cut',
      label: 'splice-gusset',
      placement: {
        kind: 'splice-gusset',
        hostKind: 'wall-plate',
        hostId: wallId,
        hostSubKey: 'bottom',
        positionAlongIn: j.positionIn - j.gussetLengthIn / 2,
        spliceFace: 'top',
      },
    });
  }

  for (let layer = 0; layer < geom.nTopPlateLayers; layer++) {
    const topSplit = splitPiece({
      pieceLengthIn: plateTotalLen,
      maxSegmentLengthIn: p.maxPieceLengthIn,
      stockThicknessIn: p.stockThicknessIn,
      memberDepthIn: p.topPlateHeightIn,
      gussetWidthIn: p.studDepthIn,
      strategy: 'snapToGrid',
      preferredPositionsIn: preferredSplices,
      staggerOffsetIn: layer === 1 ? geom.bayWidthIn : 0,
      joint: 'butt-gusset',
    });

    for (const seg of topSplit.segments) {
      const segStartX = seg.startIn - plateOverhang;
      const segEndX = seg.endIn - plateOverhang;
      const marks = layer === 0
        ? studMarksOnSegment(studPositions, segStartX, segEndX, 0, p.studWidthIn, p.stockThicknessIn, topCutH)
        : [];
      pieces.push({
        polygon: rectanglePolygon(seg.lengthIn, topCutH),
        op: 'cut',
        label: 'top-plate',
        placement: { kind: 'wall-top-plate', wallId, layer: layer as 0 | 1 },
        engravedFeatures: marks,
      });
    }

    for (const j of topSplit.joints) {
      pieces.push({
        polygon: gussetPolygon(j),
        op: 'cut',
        label: 'splice-gusset',
        placement: {
          kind: 'splice-gusset',
          hostKind: 'wall-plate',
          hostId: wallId,
          hostSubKey: `top:${layer}`,
          positionAlongIn: j.positionIn - j.gussetLengthIn / 2,
          spliceFace: 'top',
        },
      });
    }
  }

  for (let i = 0; i < nStuds; i++) {
    pieces.push({
      polygon: rectanglePolygon(p.studWidthIn, geom.interPlateHeightIn),
      op: 'cut',
      label: 'stud',
      placement: { kind: 'wall-stud', wallId, indexAlongWall: i },
    });
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const w = row.spanFullWidth ? p.widthIn : geom.bayWidthIn;
    pieces.push({
      polygon: rectanglePolygon(w, p.blockingThicknessIn),
      op: 'cut',
      label: 'block',
      placement: { kind: 'wall-block', wallId, bayIndex: row.bayIndex, rowIndex: r },
    });
  }

  if (plateTotalLen > p.maxPieceLengthIn) {
    const nSegs = bottomSplit.segments.length;
    warnings.push(`Wall plate length ${plateTotalLen.toFixed(2)} in exceeds max piece length; plates split into ${nSegs} segments with ${bottomSplit.joints.length} butt-gusset splice(s)`);
  }

  return { pieces, warnings };
}
