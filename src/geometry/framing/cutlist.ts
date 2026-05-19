import type { Piece, Polygon } from '../core/types';
import type { FramingParams, EngraveStyle, BlockRow } from './types';
import { computeFramingGeometry, computeMemberPositions } from './compute';
import { resolveBlockingRows } from './blocking';
import { rectanglePolygon } from './polygons';
import { splitPiece, type SpliceJoint } from '../core/joinery';

export interface FramingCutListResult {
  pieces: Piece[];
  warnings: string[];
  spareCounts: { members: number; endCaps: number; blocks: number; spliceGussets: number };
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
      engravedFeatures: blockMarksOnMember(i, rows, p.stockThicknessIn, p.memberDepthIn, p.engraveStyle),
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

  // Spare pieces. Clone canonical templates per kind so spares are visibly
  // marked but otherwise identical (so the laser cuts them at the same size).
  const sanitize = (n: number) => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const spareCounts = {
    members: sanitize(p.spares?.members ?? 0),
    endCaps: sanitize(p.spares?.endCaps ?? 0),
    blocks: sanitize(p.spares?.blocks ?? 0),
    spliceGussets: sanitize(p.spares?.spliceGussets ?? 0),
  };

  // Cache templates BEFORE any spare push so .find never picks up a spare clone.
  const memberTemplate = pieces.find((x) => x.placement?.kind === 'framing-member');
  const endCapTemplate = pieces.find((x) => x.placement?.kind === 'framing-end-cap');
  const blockTemplate = pieces.find((x) => x.placement?.kind === 'framing-block');
  const gussetTemplate = pieces.find((x) => x.placement?.kind === 'splice-gusset');

  if (memberTemplate) {
    for (let i = 0; i < spareCounts.members; i++) {
      pieces.push({
        ...memberTemplate,
        label: `${memberTemplate.label ?? 'framing-member'} +spare`,
        placement: undefined,
        engravedFeatures: undefined,
      });
    }
  }

  if (endCapTemplate) {
    for (let i = 0; i < spareCounts.endCaps; i++) {
      pieces.push({
        ...endCapTemplate,
        label: `${endCapTemplate.label ?? 'framing-end-cap'} +spare`,
        placement: undefined,
        engravedFeatures: undefined,
      });
    }
  }

  if (blockTemplate) {
    for (let i = 0; i < spareCounts.blocks; i++) {
      pieces.push({
        ...blockTemplate,
        label: `${blockTemplate.label ?? 'framing-block'} +spare`,
        placement: undefined,
        engravedFeatures: undefined,
      });
    }
  } else if (spareCounts.blocks > 0) {
    // No blocks emitted (e.g., blocking=none) but user requested spare blocks.
    // Synthesize a canonical-size block. Refuse to emit degenerate sizes --
    // bayWidth can be 0 or below if effectiveSpacing collapses, which would
    // otherwise produce zero-area cuts.
    const MIN_BLOCK = 0.0625;
    const canonicalBlockWidth = geom.bayWidthIn;
    if (canonicalBlockWidth >= MIN_BLOCK) {
      for (let i = 0; i < spareCounts.blocks; i++) {
        pieces.push({
          polygon: rectanglePolygon(canonicalBlockWidth, p.memberDepthIn),
          op: 'cut',
          label: 'framing-block +spare',
        });
      }
    } else {
      warnings.push(
        `Skipped ${spareCounts.blocks} spare block(s): bay width ${canonicalBlockWidth.toFixed(3)}" is too small to emit a useful piece.`,
      );
    }
  }

  if (gussetTemplate) {
    for (let i = 0; i < spareCounts.spliceGussets; i++) {
      pieces.push({
        ...gussetTemplate,
        label: `${gussetTemplate.label ?? 'splice-gusset'} +spare`,
        placement: undefined,
        engravedFeatures: undefined,
      });
    }
  }

  return { pieces, warnings, spareCounts };
}
