import type { Piece, Piece3D } from '../core/types';
import type { FramingParams } from './types';
import { framingParamsToUnit } from './types';
import { computeFramingGeometry, computeMemberPositions } from './compute';
import { resolveBlockingRows } from './blocking';
import { rectanglePolygon } from './polygons';
import { resolvePiece, type ResolveContext, type FramingFrame } from '../core/resolver';
import { splitPiece } from '../core/joinery';

export function computeFramingPieces3D(p: FramingParams, framingId: string): Piece3D[] {
  const geom = computeFramingGeometry(p);
  const memberPositions = computeMemberPositions(p);
  const nMembers = memberPositions.length;
  const nBays = Math.max(0, nMembers - 1);
  const blockRows = resolveBlockingRows(p.blocking, nBays, geom.interEndCapSpanIn);

  const unit = framingParamsToUnit(p, framingId);

  const frame: FramingFrame = {
    unit,
    translation: [0, 0, 0],
    rotationZRadians: 0,
    memberPositionsIn: memberPositions,
    nEndCapBLayers: geom.nEndCapBLayers,
    interEndCapSpanIn: geom.interEndCapSpanIn,
    bayWidthIn: geom.bayWidthIn,
    blockRows,
  };

  const ctx: ResolveContext = {
    building: { units: [], intersections: [], sheetWidthIn: 0, maxPieceLengthIn: 0, marginIn: 0 },
    unitFrames: new Map(),
    dormerFrames: new Map(),
    framingFrames: new Map([[framingId, frame]]),
  };

  const declared: Piece[] = [];
  const endCapOverhang = p.stockThicknessIn / 2;
  const endCapTotalLen = p.lengthIn + p.stockThicknessIn;
  const preferredSplices = memberPositions.map((x) => x + endCapOverhang);

  const splitA = splitPiece({
    pieceLengthIn: endCapTotalLen,
    maxSegmentLengthIn: p.maxPieceLengthIn,
    stockThicknessIn: p.stockThicknessIn,
    memberDepthIn: p.endCapHeightIn,
    gussetWidthIn: p.memberDepthIn,
    strategy: 'snapToGrid',
    preferredPositionsIn: preferredSplices,
    joint: 'butt-gusset',
  });
  for (const seg of splitA.segments) {
    declared.push({
      polygon: rectanglePolygon(seg.lengthIn, p.memberDepthIn),
      op: 'cut',
      label: 'framing-end-cap-A',
      placement: { kind: 'framing-end-cap', framingId, endCap: 'A', layer: 0, segmentStartIn: seg.startIn },
    });
  }
  for (const j of splitA.joints) {
    declared.push({
      polygon: rectanglePolygon(j.gussetLengthIn, j.gussetWidthIn),
      op: 'cut', label: 'splice-gusset',
      placement: { kind: 'splice-gusset', hostKind: 'framing-end-cap', hostId: framingId, hostSubKey: 'A', positionAlongIn: j.positionIn - j.gussetLengthIn / 2, spliceFace: 'top' },
    });
  }

  for (let layer = 0; layer < geom.nEndCapBLayers; layer++) {
    const splitB = splitPiece({
      pieceLengthIn: endCapTotalLen,
      maxSegmentLengthIn: p.maxPieceLengthIn,
      stockThicknessIn: p.stockThicknessIn,
      memberDepthIn: p.endCapHeightIn,
      gussetWidthIn: p.memberDepthIn,
      strategy: 'snapToGrid',
      preferredPositionsIn: preferredSplices,
      staggerOffsetIn: layer === 1 ? p.memberSpacingIn : 0,
      joint: 'butt-gusset',
    });
    for (const seg of splitB.segments) {
      declared.push({
        polygon: rectanglePolygon(seg.lengthIn, p.memberDepthIn),
        op: 'cut', label: 'framing-end-cap-B',
        placement: { kind: 'framing-end-cap', framingId, endCap: 'B', layer: layer as 0 | 1, segmentStartIn: seg.startIn },
      });
    }
    for (const j of splitB.joints) {
      declared.push({
        polygon: rectanglePolygon(j.gussetLengthIn, j.gussetWidthIn),
        op: 'cut', label: 'splice-gusset',
        placement: { kind: 'splice-gusset', hostKind: 'framing-end-cap', hostId: framingId, hostSubKey: `B:${layer}`, positionAlongIn: j.positionIn - j.gussetLengthIn / 2, spliceFace: 'top' },
      });
    }
  }

  for (let i = 0; i < nMembers; i++) {
    declared.push({
      polygon: rectanglePolygon(p.stockThicknessIn, p.memberDepthIn),
      op: 'cut', label: 'framing-member',
      placement: { kind: 'framing-member', framingId, indexAlongLength: i },
    });
  }

  for (let r = 0; r < blockRows.length; r++) {
    const row = blockRows[r];
    const w = row.spanFullLength ? p.lengthIn : geom.bayWidthIn;
    declared.push({
      polygon: rectanglePolygon(w, p.mode === 'wall' ? p.memberDepthIn : p.blockingThicknessIn),
      op: 'cut', label: 'framing-block',
      placement: { kind: 'framing-block', framingId, bayIndex: row.bayIndex, rowIndex: r },
    });
  }

  return declared.map((piece) => resolvePiece(piece, ctx));
}
