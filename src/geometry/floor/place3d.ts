import type { Piece, Piece3D } from '../core/types';
import type { FloorParams } from './types';
import { computeFloorGeometry, computeJoistPositions } from './compute';
import { resolveBlockingRows } from './blocking';
import { rectanglePolygon } from './polygons';
import { resolvePiece, type ResolveContext, type FloorFrame } from '../core/resolver';
import { splitPiece } from '../core/joinery';

export function computeFloorPieces3D(p: FloorParams, floorId: string): Piece3D[] {
  const geom = computeFloorGeometry(p);
  const joistPositions = computeJoistPositions(p);
  const nJoists = joistPositions.length;
  const nBays = Math.max(0, nJoists - 1);
  const blockRows = resolveBlockingRows(p.blocking, nBays, geom.interRimDepthIn);

  const unit = {
    id: floorId,
    widthIn: p.widthIn,
    depthIn: p.depthIn,
    joistSpacingIn: p.joistSpacingIn,
    joistThicknessIn: p.joistThicknessIn,
    joistDepthIn: p.joistDepthIn,
    nJoistsOverride: p.nJoistsOverride,
    rimThicknessIn: p.rimThicknessIn,
    blocking: p.blocking,
    blockingThicknessIn: p.blockingThicknessIn,
    stockThicknessIn: p.stockThicknessIn,
  };

  const frame: FloorFrame = {
    unit,
    translation: [0, 0, 0],
    rotationZRadians: 0,
    joistPositionsIn: joistPositions,
    interRimDepthIn: geom.interRimDepthIn,
    bayWidthIn: geom.bayWidthIn,
    blockRows,
  };

  const ctx: ResolveContext = {
    building: { units: [], intersections: [], sheetWidthIn: 0, maxPieceLengthIn: 0, marginIn: 0 },
    unitFrames: new Map(),
    dormerFrames: new Map(),
    wallFrames: new Map(),
    floorFrames: new Map([[floorId, frame]]),
    framingFrames: new Map(),
  };

  const declared: Piece[] = [];

  const rimOverhang = p.stockThicknessIn / 2;
  const rimTotalLen = p.widthIn + p.stockThicknessIn;
  const preferredSplices = joistPositions.map((x) => x + rimOverhang);

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
    for (const seg of split.segments) {
      declared.push({
        polygon: rectanglePolygon(seg.lengthIn, p.joistDepthIn),
        op: 'cut',
        label: `${side}-rim`,
        placement: { kind: 'floor-rim', floorId, side, segmentStartIn: seg.startIn },
      });
    }
    for (const j of split.joints) {
      declared.push({
        polygon: rectanglePolygon(j.gussetLengthIn, j.gussetWidthIn),
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
    declared.push({
      polygon: rectanglePolygon(p.stockThicknessIn, geom.interRimDepthIn),
      op: 'cut',
      label: 'joist',
      placement: { kind: 'floor-joist', floorId, indexAlongWidth: i },
    });
  }

  for (let r = 0; r < blockRows.length; r++) {
    const row = blockRows[r];
    const w = row.spanFullWidth ? p.widthIn : geom.bayWidthIn;
    declared.push({
      polygon: rectanglePolygon(w, p.blockingThicknessIn),
      op: 'cut',
      label: 'block',
      placement: { kind: 'floor-block', floorId, bayIndex: row.bayIndex, rowIndex: r },
    });
  }

  return declared.map((piece) => resolvePiece(piece, ctx));
}
