import type { Piece, Piece3D } from '../core/types';
import type { WallParams } from './types';
import { computeWallGeometry, computeStudPositions } from './compute';
import { resolveBlockingRows } from './blocking';
import { rectanglePolygon } from './polygons';
import { resolvePiece, type ResolveContext, type WallFrame } from '../core/resolver';
import { splitPiece } from '../core/joinery';

export function computeWallPieces3D(p: WallParams, wallId: string): Piece3D[] {
  const geom = computeWallGeometry(p);
  const studPositions = computeStudPositions(p);
  const nStuds = studPositions.length;
  const nBays = Math.max(0, nStuds - 1);
  const blockRows = resolveBlockingRows(p.blocking, nBays, geom.interPlateHeightIn);

  const unit = {
    id: wallId,
    widthIn: p.widthIn,
    heightIn: p.heightIn,
    studSpacingIn: p.studSpacingIn,
    studWidthIn: p.studWidthIn,
    studDepthIn: p.studDepthIn,
    nStudsOverride: p.nStudsOverride,
    topPlateHeightIn: p.topPlateHeightIn,
    bottomPlateHeightIn: p.bottomPlateHeightIn,
    doubleTopPlate: p.doubleTopPlate,
    blocking: p.blocking,
    blockingThicknessIn: p.blockingThicknessIn,
    stockThicknessIn: p.stockThicknessIn,
  };

  const frame: WallFrame = {
    unit,
    translation: [0, 0, 0],
    rotationZRadians: 0,
    studPositionsIn: studPositions,
    nTopPlateLayers: geom.nTopPlateLayers,
    interPlateHeightIn: geom.interPlateHeightIn,
    bayWidthIn: geom.bayWidthIn,
    blockRows,
  };

  const ctx: ResolveContext = {
    building: { units: [], intersections: [], sheetWidthIn: 0, maxPieceLengthIn: 0, marginIn: 0 },
    unitFrames: new Map(),
    dormerFrames: new Map(),
    wallFrames: new Map([[wallId, frame]]),
    floorFrames: new Map(),
  };

  const declared: Piece[] = [];

  const plateOverhang = p.stockThicknessIn / 2;
  const plateTotalLen = p.widthIn + p.stockThicknessIn;
  const preferredSplices = studPositions.map((x) => x + plateOverhang);

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
    declared.push({
      polygon: rectanglePolygon(seg.lengthIn, p.studDepthIn),
      op: 'cut',
      label: 'bottom-plate',
      placement: { kind: 'wall-bottom-plate', wallId, segmentStartIn: seg.startIn },
    });
  }

  for (const j of bottomSplit.joints) {
    declared.push({
      polygon: rectanglePolygon(j.gussetLengthIn, j.gussetWidthIn),
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
      staggerOffsetIn: layer === 1 ? p.studSpacingIn : 0,
      joint: 'butt-gusset',
    });
    for (const seg of topSplit.segments) {
      declared.push({
        polygon: rectanglePolygon(seg.lengthIn, p.studDepthIn),
        op: 'cut',
        label: 'top-plate',
        placement: { kind: 'wall-top-plate', wallId, layer: layer as 0 | 1, segmentStartIn: seg.startIn },
      });
    }
    for (const j of topSplit.joints) {
      declared.push({
        polygon: rectanglePolygon(j.gussetLengthIn, j.gussetWidthIn),
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
    declared.push({
      polygon: rectanglePolygon(p.stockThicknessIn, p.studDepthIn),
      op: 'cut',
      label: 'stud',
      placement: { kind: 'wall-stud', wallId, indexAlongWall: i },
    });
  }
  for (let r = 0; r < blockRows.length; r++) {
    const row = blockRows[r];
    const w = row.spanFullWidth ? p.widthIn : geom.bayWidthIn;
    declared.push({
      polygon: rectanglePolygon(w, p.studDepthIn),
      op: 'cut',
      label: 'block',
      placement: { kind: 'wall-block', wallId, bayIndex: row.bayIndex, rowIndex: r },
    });
  }
  return declared.map((piece) => resolvePiece(piece, ctx));
}
