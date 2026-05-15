import type { Piece, Piece3D } from '../core/types';
import type { FloorParams } from './types';
import { computeFloorGeometry, computeJoistPositions } from './compute';
import { resolveBlockingRows } from './blocking';
import { rectanglePolygon } from './polygons';
import { resolvePiece, type ResolveContext, type FloorFrame } from '../core/resolver';

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
  };

  const declared: Piece[] = [];

  const rimTotalLen = p.widthIn + p.joistThicknessIn;
  for (const side of ['front', 'back'] as const) {
    declared.push({
      polygon: rectanglePolygon(rimTotalLen, p.rimThicknessIn),
      op: 'cut',
      label: `${side}-rim`,
      placement: { kind: 'floor-rim', floorId, side },
    });
  }

  for (let i = 0; i < nJoists; i++) {
    declared.push({
      polygon: rectanglePolygon(p.joistThicknessIn, geom.interRimDepthIn),
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
