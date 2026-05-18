import type { Piece, Polygon } from '../core/types';
import type { FramingParams, EngraveStyle, BlockRow } from './types';
import { computeFramingGeometry, computeMemberPositions } from './compute';
import { resolveBlockingRows } from './blocking';
import { rectanglePolygon } from './polygons';
import { splitPiece, type SpliceJoint } from '../core/joinery';

export interface FramingCutListResult {
  pieces: Piece[];
  warnings: string[];
}

const MARK_LINE_WIDTH_IN = 0.015;

// Emit marks for a single attachment centered at `centerAlongLong` along the strip's long axis.
// `footprintAlongLong` is the attached part's footprint along that axis (e.g., stud's 1/8" on the plate).
// `crossDim` is the strip's perpendicular extent.
// `axis` = 'X' when long axis is X (end caps), 'Y' when long axis is Y (members).
function marksAtPosition(
  centerAlongLong: number,
  footprintAlongLong: number,
  crossDim: number,
  style: EngraveStyle,
  axis: 'X' | 'Y',
): Polygon[] {
  if (style === 'none') return [];
  const half = footprintAlongLong / 2;
  if (style === 'solid') {
    const lo = centerAlongLong - half;
    const hi = centerAlongLong + half;
    if (axis === 'X') {
      return [[
        [lo, 0],
        [hi, 0],
        [hi, crossDim],
        [lo, crossDim],
      ]];
    }
    return [[
      [0, lo],
      [crossDim, lo],
      [crossDim, hi],
      [0, hi],
    ]];
  }
  // brackets
  const w = MARK_LINE_WIDTH_IN;
  const out: Polygon[] = [];
  for (const offset of [-half, half]) {
    const c = centerAlongLong + offset;
    if (axis === 'X') {
      out.push([
        [c - w / 2, 0],
        [c + w / 2, 0],
        [c + w / 2, crossDim],
        [c - w / 2, crossDim],
      ]);
    } else {
      out.push([
        [0, c - w / 2],
        [crossDim, c - w / 2],
        [crossDim, c + w / 2],
        [0, c + w / 2],
      ]);
    }
  }
  return out;
}

function memberMarksOnSegment(
  memberPositionsIn: readonly number[],
  segStartX: number,
  segEndX: number,
  endCapOffsetX: number,
  memberFootprintIn: number,
  endCapCutHeightIn: number,
  style: EngraveStyle,
): Polygon[] {
  const marks: Polygon[] = [];
  for (const xCenter of memberPositionsIn) {
    if (xCenter < segStartX - 1e-9 || xCenter > segEndX + 1e-9) continue;
    const localX = xCenter - segStartX + endCapOffsetX;
    marks.push(...marksAtPosition(localX, memberFootprintIn, endCapCutHeightIn, style, 'X'));
  }
  return marks;
}

function blockMarksOnMember(
  studIndex: number,
  nStuds: number,
  blockRows: ReadonlyArray<BlockRow>,
  blockFootprintIn: number,
  memberCrossDim: number,
  style: EngraveStyle,
): Polygon[] {
  if (style === 'none' || blockRows.length === 0) return [];
  const marks: Polygon[] = [];
  const seen = new Set<number>();
  // Each block is engraved on only ONE adjacent stud so the cut sheet doesn't double-mark.
  // Convention: a block in bay i is marked on stud i (the stud on its left). Full-length
  // blocks span all bays so they get marked on every stud. The last stud (rightmost) has
  // no bay i, so it only carries full-length marks.
  for (const row of blockRows) {
    const owns = row.spanFullLength || row.bayIndex === studIndex;
    if (!owns) continue;
    const key = Math.round(row.positionFromEndCapAIn * 1e6);
    if (seen.has(key)) continue;
    seen.add(key);
    marks.push(...marksAtPosition(row.positionFromEndCapAIn, blockFootprintIn, memberCrossDim, style, 'Y'));
  }
  void nStuds;
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
      engravedFeatures: memberMarksOnSegment(memberPositions, segStartX, segEndX, 0, p.stockThicknessIn, endCapCutH, p.engraveStyle),
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
        ? memberMarksOnSegment(memberPositions, segStartX, segEndX, 0, p.stockThicknessIn, endCapCutH, p.engraveStyle)
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
      engravedFeatures: blockMarksOnMember(i, nMembers, rows, p.stockThicknessIn, p.memberDepthIn, p.engraveStyle),
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
