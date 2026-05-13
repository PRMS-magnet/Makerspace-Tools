import type { SplitParams, SplitResult, SplitJoint, Polygon, PolygonWithHoles, Vec2 } from './types';
import { isPolygonWithHoles } from './types';

const DEFAULT_LAP_MULTIPLIER = 3;

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
