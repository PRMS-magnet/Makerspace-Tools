import type { SplitParams, SplitResult, SplitJoint, Polygon, PolygonWithHoles, Vec2 } from './types';
import { isPolygonWithHoles } from './types';

const DEFAULT_LAP_MULTIPLIER = 3;
const DEFAULT_GUSSET_LENGTH_MULTIPLIER = 4;

export type SpliceStrategy = 'equalN' | 'snapToGrid';
export type SpliceJointKind = 'butt-gusset' | 'none';

export interface ButtGussetSplice {
  kind: 'butt-gusset';
  positionIn: number;
  gussetLengthIn: number;
  gussetWidthIn: number;
  gussetSides: 1 | 2;
}

export type SpliceJoint = ButtGussetSplice;

export interface SpliceSegment {
  index: number;
  startIn: number;
  endIn: number;
  lengthIn: number;
}

export interface SplitPieceInput {
  pieceLengthIn: number;
  maxSegmentLengthIn: number;
  stockThicknessIn: number;
  memberDepthIn?: number;
  gussetWidthIn?: number;
  strategy?: SpliceStrategy;
  preferredPositionsIn?: readonly number[];
  snapToleranceIn?: number;
  staggerOffsetIn?: number;
  joint?: SpliceJointKind;
  gussetLengthMultiplier?: number;
  gussetSides?: 1 | 2;
}

export interface SplitPieceResult {
  segments: SpliceSegment[];
  splicePositionsIn: number[];
  joints: SpliceJoint[];
}

function snapToNearest(target: number, candidates: readonly number[]): number {
  let best = candidates[0];
  let bestDist = Math.abs(target - best);
  for (let i = 1; i < candidates.length; i++) {
    const d = Math.abs(target - candidates[i]);
    if (d < bestDist) {
      best = candidates[i];
      bestDist = d;
    }
  }
  return best;
}

function feasibleEqualN(
  pieceLengthIn: number,
  nSegments: number,
  staggerOffsetIn: number,
): number[] {
  const seg = pieceLengthIn / nSegments;
  const out: number[] = [];
  for (let i = 1; i < nSegments; i++) {
    let p = i * seg + staggerOffsetIn;
    if (p <= 0 || p >= pieceLengthIn) p = i * seg;
    out.push(p);
  }
  return out;
}

function trySnap(
  positions: readonly number[],
  preferred: readonly number[],
  tolerance: number,
): { snapped: number[]; allWithinTolerance: boolean } {
  if (preferred.length === 0) return { snapped: [...positions], allWithinTolerance: false };
  let allWithin = true;
  const snapped: number[] = [];
  for (const p of positions) {
    const s = snapToNearest(p, preferred);
    if (Math.abs(s - p) > tolerance + 1e-9) allWithin = false;
    snapped.push(s);
  }
  return { snapped, allWithinTolerance: allWithin };
}

function segmentLengths(splices: readonly number[], totalIn: number): number[] {
  const lens: number[] = [];
  let prev = 0;
  for (const s of splices) {
    lens.push(s - prev);
    prev = s;
  }
  lens.push(totalIn - prev);
  return lens;
}

export function splitPiece(input: SplitPieceInput): SplitPieceResult {
  const {
    pieceLengthIn,
    maxSegmentLengthIn,
    stockThicknessIn,
    memberDepthIn,
    strategy = 'equalN',
    preferredPositionsIn = [],
    staggerOffsetIn = 0,
    joint = 'butt-gusset',
    gussetLengthMultiplier = DEFAULT_GUSSET_LENGTH_MULTIPLIER,
    gussetSides = 1,
  } = input;

  if (pieceLengthIn <= maxSegmentLengthIn + 1e-9) {
    return {
      segments: [{ index: 0, startIn: 0, endIn: pieceLengthIn, lengthIn: pieceLengthIn }],
      splicePositionsIn: [],
      joints: [],
    };
  }

  const nMin = Math.ceil(pieceLengthIn / maxSegmentLengthIn);
  let nSegments = nMin;
  let splices: number[] = [];

  for (let attempt = 0; attempt < 8; attempt++) {
    const equalN = feasibleEqualN(pieceLengthIn, nSegments, staggerOffsetIn);
    let candidates = equalN;
    if (strategy === 'snapToGrid' && preferredPositionsIn.length > 0) {
      const tol = input.snapToleranceIn ?? (pieceLengthIn / nSegments) * 0.5;
      const { snapped } = trySnap(equalN, preferredPositionsIn, tol);
      const deduped: number[] = [];
      const seen = new Set<number>();
      for (const x of snapped) {
        const key = Math.round(x * 1e6);
        if (!seen.has(key)) { seen.add(key); deduped.push(x); }
      }
      if (deduped.length < nSegments - 1) {
        nSegments++;
        continue;
      }
      candidates = deduped;
    }
    const lens = segmentLengths(candidates, pieceLengthIn);
    const maxLen = Math.max(...lens);
    if (maxLen <= maxSegmentLengthIn + 1e-9) {
      splices = candidates;
      break;
    }
    nSegments++;
  }

  if (splices.length === 0) {
    splices = feasibleEqualN(pieceLengthIn, nSegments, 0);
  }

  splices.sort((a, b) => a - b);

  const lens = segmentLengths(splices, pieceLengthIn);
  const segments: SpliceSegment[] = [];
  {
    let cursor = 0;
    for (let i = 0; i < lens.length; i++) {
      segments.push({ index: i, startIn: cursor, endIn: cursor + lens[i], lengthIn: lens[i] });
      cursor += lens[i];
    }
  }

  const joints: SpliceJoint[] = [];
  if (joint === 'butt-gusset' && splices.length > 0) {
    const basisIn = memberDepthIn ?? stockThicknessIn;
    const gussetLengthIn = gussetLengthMultiplier * basisIn;
    const gussetWidth = input.gussetWidthIn ?? basisIn;
    for (const positionIn of splices) {
      joints.push({
        kind: 'butt-gusset',
        positionIn,
        gussetLengthIn,
        gussetWidthIn: gussetWidth,
        gussetSides,
      });
    }
  }

  return { segments, splicePositionsIn: splices, joints };
}

export function splitForLength(p: SplitParams): SplitResult {
  const { pieceLengthIn, maxPieceLengthIn, stockThicknessIn } = p;
  const lapMultiplier = p.lapMultiplier ?? DEFAULT_LAP_MULTIPLIER;

  if (pieceLengthIn <= maxPieceLengthIn) {
    return {
      segments: 1,
      segmentLengthIn: pieceLengthIn,
      gussetLengthIn: 0,
      gussetCount: 0,
      joints: [],
    };
  }

  const segments = Math.ceil(pieceLengthIn / maxPieceLengthIn);
  const segmentLengthIn = pieceLengthIn / segments;
  const gussetLengthIn = lapMultiplier * stockThicknessIn;
  const gussetCount = segments - 1;

  const joints: SplitJoint[] = [];
  const oneThird = pieceLengthIn / 3;
  const twoThirds = (2 * pieceLengthIn) / 3;

  for (let i = 1; i < segments; i++) {
    const atIn = segmentLengthIn * i;
    const isMiddleThird = atIn > oneThird && atIn < twoThirds;
    joints.push({
      atIn,
      ...(isMiddleThird ? { supportHintIn: atIn } : {}),
    });
  }

  return { segments, segmentLengthIn, gussetLengthIn, gussetCount, joints };
}

export interface TenonOpts {
  insertAfterIndex: number;
  widthIn: number;
  lengthIn: number;
  positionAlong: number;
}

export function applyTenon(p: Polygon, opts: TenonOpts): Polygon {
  const i = opts.insertAfterIndex;
  const start = p[i];
  const end = p[(i + 1) % p.length];
  const ex = end[0] - start[0];
  const ey = end[1] - start[1];
  const edgeLen = Math.hypot(ex, ey);
  const ux = ex / edgeLen;
  const uy = ey / edgeLen;
  const nx = uy;
  const ny = -ux;
  const t = opts.positionAlong;
  const bx = start[0] + ex * t;
  const by = start[1] + ey * t;
  const halfW = opts.widthIn / 2;
  const L = opts.lengthIn;
  const BL: Vec2 = [bx - ux * halfW, by - uy * halfW];
  const BR: Vec2 = [bx + ux * halfW, by + uy * halfW];
  const TR: Vec2 = [BR[0] + nx * L, BR[1] + ny * L];
  const TL: Vec2 = [BL[0] + nx * L, BL[1] + ny * L];
  const out: Vec2[] = [];
  for (let k = 0; k <= i; k++) out.push([p[k][0], p[k][1]]);
  out.push(BL, TL, TR, BR);
  for (let k = i + 1; k < p.length; k++) out.push([p[k][0], p[k][1]]);
  return out;
}

export interface MortiseOpts {
  centerIn: Vec2;
  widthIn: number;
  heightIn: number;
}

export function applyMortise(
  p: Polygon | PolygonWithHoles,
  opts: MortiseOpts,
): PolygonWithHoles {
  const [cx, cy] = opts.centerIn;
  const hw = opts.widthIn / 2;
  const hh = opts.heightIn / 2;
  const hole: Polygon = [
    [cx - hw, cy - hh],
    [cx + hw, cy - hh],
    [cx + hw, cy + hh],
    [cx - hw, cy + hh],
  ];
  if (isPolygonWithHoles(p)) {
    return { outline: p.outline, holes: [...p.holes, hole] };
  }
  return { outline: p, holes: [hole] };
}
