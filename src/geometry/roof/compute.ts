import type { RoofParams, RoofGeometry } from './types';

export function computeRoofGeometry(p: RoofParams, stockThicknessIn = 0.125): RoofGeometry {
  const theta = Math.atan2(p.pitchRise, p.pitchRun);
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  const tanT = Math.tan(theta);
  const halfSpan = p.spanIn / 2;
  const halfRidge = stockThicknessIn / 2;
  const R = halfSpan - halfRidge;
  const riseAtRidgeFace = R * tanT;
  const riseAtCenterline = halfSpan * tanT;
  const heelHeight = p.wallThicknessIn * tanT;
  const plumbCutLength = p.rafterDepthIn / cosT;
  const rafterSlopeLength = (R - p.wallThicknessIn + p.overhangRunIn) / cosT;
  return {
    theta,
    thetaDeg: (theta * 180) / Math.PI,
    sinT,
    cosT,
    tanT,
    halfSpan,
    halfRidge,
    R,
    riseAtRidgeFace,
    riseAtCenterline,
    heelHeight,
    plumbCutLength,
    rafterSlopeLength,
  };
}
