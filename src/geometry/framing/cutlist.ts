import type { Piece, Polygon } from '../core/types';
import type { FramingParams } from './types';
import { computeFramingGeometry, computeMemberPositions } from './compute';
import { resolveBlockingRows } from './blocking';
import { rectanglePolygon } from './polygons';
import { splitPiece, type SpliceJoint } from '../core/joinery';

export interface FramingCutListResult {
  pieces: Piece[];
  warnings: string[];
}

const MARK_LINE_WIDTH_IN = 0.015;

function memberMarksOnSegment(
  memberPositionsIn: readonly number[],
  segStartX: number,
  segEndX: number,
  endCapOffsetX: number,
  memberFootprintIn: number,
  endCapCutHeightIn: number,
): Polygon[] {
  const marks: Polygon[] = [];
  const w = MARK_LINE_WIDTH_IN;
  const halfMember = memberFootprintIn / 2;
  for (const xCenter of memberPositionsIn) {
    if (xCenter < segStartX - 1e-9 || xCenter > segEndX + 1e-9) continue;
    const baseLocal = xCenter - segStartX + endCapOffsetX;
    for (const offset of [-halfMember, halfMember]) {
      const localX = baseLocal + offset - w / 2;
      marks.push([
        [localX, 0],
        [localX + w, 0],
        [localX + w, endCapCutHeightIn],
        [localX, endCapCutHeightIn],
      ]);
    }
  }
  return marks;
}

function gussetPolygon(j: SpliceJoint): Polygon {
  return rectanglePolygon(j.gussetLengthIn, j.gussetWidthIn);
}

function endCapNoun(mode: 'wall' | 'floor'): string {
  return mode === 'wall' ? 'plate' : 'rim';
}

export function buildFramingCutListPieces(p: FramingParams, framingId: string): FramingCutListResult {
  const pieces: Piece[] = [];
  const warnings: string[] = [];

  const geom = computeFramingGeometry(p);
  const memberPositions = computeMemberPositions(p);
  const nMembers = memberPositions.length;
  const nBays = Math.max(0, nMembers - 1);
  const rows = resolveBlockingRows(p.blocking, nBays, geom.interEndCapSpanIn);

  const endCapOverhang = p.stockThicknessIn / 2;
  const endCapTotalLen = p.lengthIn + p.stockThicknessIn;
  const preferredSplices = memberPositions.map((x) => x + endCapOverhang);
  const endCapCutH = p.memberDepthIn;

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
    const segStartX = seg.startIn - endCapOverhang;
    const segEndX = seg.endIn - endCapOverhang;
    pieces.push({
      polygon: rectanglePolygon(seg.lengthIn, endCapCutH),
      op: 'cut',
      label: `framing-end-cap-A-${p.mode}`,
      placement: { kind: 'framing-end-cap', framingId, endCap: 'A', layer: 0, segmentStartIn: seg.startIn },
      engravedFeatures: memberMarksOnSegment(memberPositions, segStartX, segEndX, 0, p.stockThicknessIn, endCapCutH),
    });
  }
  for (const j of splitA.joints) {
    pieces.push({
      polygon: gussetPolygon(j),
      op: 'cut',
      label: 'splice-gusset',
      placement: {
        kind: 'splice-gusset',
        hostKind: 'framing-end-cap',
        hostId: framingId,
        hostSubKey: 'A',
        positionAlongIn: j.positionIn - j.gussetLengthIn / 2,
        spliceFace: 'top',
      },
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
      const segStartX = seg.startIn - endCapOverhang;
      const segEndX = seg.endIn - endCapOverhang;
      const marks = layer === 0
        ? memberMarksOnSegment(memberPositions, segStartX, segEndX, 0, p.stockThicknessIn, endCapCutH)
        : [];
      pieces.push({
        polygon: rectanglePolygon(seg.lengthIn, endCapCutH),
        op: 'cut',
        label: `framing-end-cap-B-${p.mode}`,
        placement: { kind: 'framing-end-cap', framingId, endCap: 'B', layer: layer as 0 | 1, segmentStartIn: seg.startIn },
        engravedFeatures: marks,
      });
    }
    for (const j of splitB.joints) {
      pieces.push({
        polygon: gussetPolygon(j),
        op: 'cut',
        label: 'splice-gusset',
        placement: {
          kind: 'splice-gusset',
          hostKind: 'framing-end-cap',
          hostId: framingId,
          hostSubKey: `B:${layer}`,
          positionAlongIn: j.positionIn - j.gussetLengthIn / 2,
          spliceFace: 'top',
        },
      });
    }
  }

  for (let i = 0; i < nMembers; i++) {
    pieces.push({
      polygon: rectanglePolygon(p.memberDepthIn, geom.interEndCapSpanIn),
      op: 'cut',
      label: `framing-member-${p.mode}`,
      placement: { kind: 'framing-member', framingId, indexAlongLength: i },
    });
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const w = row.spanFullLength ? p.lengthIn : geom.bayWidthIn;
    pieces.push({
      polygon: rectanglePolygon(w, p.memberDepthIn),
      op: 'cut',
      label: 'framing-block',
      placement: { kind: 'framing-block', framingId, bayIndex: row.bayIndex, rowIndex: r },
    });
  }

  if (endCapTotalLen > p.maxPieceLengthIn) {
    const noun = endCapNoun(p.mode);
    warnings.push(`Framing ${noun} length ${endCapTotalLen.toFixed(2)} in exceeds max piece length; ${noun}s split into ${splitA.segments.length} segments with ${splitA.joints.length} butt-gusset splice(s)`);
  }

  return { pieces, warnings };
}
