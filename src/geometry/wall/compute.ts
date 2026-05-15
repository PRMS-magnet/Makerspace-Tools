import type { WallParams, WallGeometry } from './types';

export function computeWallGeometry(p: WallParams): WallGeometry {
  const nTopPlateLayers = p.doubleTopPlate ? 2 : 1;
  const interPlateHeightIn = Math.max(
    0,
    p.heightIn - p.bottomPlateHeightIn - nTopPlateLayers * p.topPlateHeightIn,
  );
  const bayWidthIn = Math.max(0, p.studSpacingIn - p.studWidthIn);
  return { interPlateHeightIn, bayWidthIn, nTopPlateLayers };
}

export function computeStudPositions(p: WallParams): number[] {
  let nStuds: number;
  if (p.nStudsOverride !== null) {
    nStuds = Math.max(2, p.nStudsOverride);
  } else {
    nStuds = Math.max(2, Math.round(p.widthIn / p.studSpacingIn) + 1);
  }
  if (nStuds === 2) return [0, p.widthIn];
  const step = p.widthIn / (nStuds - 1);
  const result: number[] = [];
  for (let i = 0; i < nStuds; i++) result.push(i * step);
  return result;
}
