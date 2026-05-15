import type { FloorParams, FloorGeometry } from './types';

export function computeFloorGeometry(p: FloorParams): FloorGeometry {
  const interRimDepthIn = Math.max(0, p.depthIn - 2 * p.rimThicknessIn);
  const bayWidthIn = Math.max(0, p.joistSpacingIn - p.joistThicknessIn);
  return { interRimDepthIn, bayWidthIn };
}

export function computeJoistPositions(p: FloorParams): number[] {
  let nJoists: number;
  if (p.nJoistsOverride !== null) {
    nJoists = Math.max(2, p.nJoistsOverride);
  } else {
    nJoists = Math.max(2, Math.round(p.widthIn / p.joistSpacingIn) + 1);
  }
  if (nJoists === 2) return [0, p.widthIn];
  const step = p.widthIn / (nJoists - 1);
  const result: number[] = [];
  for (let i = 0; i < nJoists; i++) result.push(i * step);
  return result;
}
