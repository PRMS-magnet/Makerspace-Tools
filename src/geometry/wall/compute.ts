import type { WallParams, WallGeometry } from './types';

function effectiveStudCount(p: WallParams): number {
  if (p.nStudsOverride !== null) return Math.max(2, p.nStudsOverride);
  return Math.max(2, Math.round(p.widthIn / p.studSpacingIn) + 1);
}

export function computeWallGeometry(p: WallParams): WallGeometry {
  const nTopPlateLayers = p.doubleTopPlate ? 2 : 1;
  const interPlateHeightIn = Math.max(
    0,
    p.heightIn - p.bottomPlateHeightIn - nTopPlateLayers * p.topPlateHeightIn,
  );
  const nStuds = effectiveStudCount(p);
  const effectiveSpacing = p.widthIn / (nStuds - 1);
  const bayWidthIn = Math.max(0, effectiveSpacing - p.stockThicknessIn);
  return { interPlateHeightIn, bayWidthIn, nTopPlateLayers };
}

export function computeStudPositions(p: WallParams): number[] {
  const nStuds = effectiveStudCount(p);
  if (nStuds === 2) return [0, p.widthIn];
  const step = p.widthIn / (nStuds - 1);
  const result: number[] = [];
  for (let i = 0; i < nStuds; i++) result.push(i * step);
  return result;
}
