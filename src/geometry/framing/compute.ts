import type { FramingParams, FramingGeometry } from './types';

export function effectiveMemberCount(p: FramingParams): number {
  if (p.nMembersOverride !== null) return Math.max(2, p.nMembersOverride);
  return Math.max(2, Math.round(p.lengthIn / p.memberSpacingIn) + 1);
}

export function computeFramingGeometry(p: FramingParams): FramingGeometry {
  const nEndCapBLayers = p.endCapBDoubled ? 2 : 1;
  const interEndCapSpanIn = Math.max(
    0,
    p.spanIn - p.endCapHeightIn - nEndCapBLayers * p.endCapHeightIn,
  );
  const n = effectiveMemberCount(p);
  const effectiveSpacing = p.lengthIn / (n - 1);
  const bayWidthIn = Math.max(0, effectiveSpacing - p.stockThicknessIn);
  return { interEndCapSpanIn, bayWidthIn, nEndCapBLayers };
}

export function computeMemberPositions(p: FramingParams): number[] {
  const n = effectiveMemberCount(p);
  if (n === 2) return [0, p.lengthIn];
  const step = p.lengthIn / (n - 1);
  const result: number[] = [];
  for (let i = 0; i < n; i++) result.push(i * step);
  return result;
}
