import type { FloorParams, FloorGeometry } from './types';

function effectiveJoistCount(p: FloorParams): number {
  if (p.nJoistsOverride !== null) return Math.max(2, p.nJoistsOverride);
  return Math.max(2, Math.round(p.widthIn / p.joistSpacingIn) + 1);
}

export function computeFloorGeometry(p: FloorParams): FloorGeometry {
  const interRimDepthIn = Math.max(0, p.depthIn - 2 * p.rimThicknessIn);
  const nJoists = effectiveJoistCount(p);
  const effectiveSpacing = p.widthIn / (nJoists - 1);
  const bayWidthIn = Math.max(0, effectiveSpacing - p.stockThicknessIn);
  return { interRimDepthIn, bayWidthIn };
}

export function computeJoistPositions(p: FloorParams): number[] {
  const nJoists = effectiveJoistCount(p);
  if (nJoists === 2) return [0, p.widthIn];
  const step = p.widthIn / (nJoists - 1);
  const result: number[] = [];
  for (let i = 0; i < nJoists; i++) result.push(i * step);
  return result;
}
