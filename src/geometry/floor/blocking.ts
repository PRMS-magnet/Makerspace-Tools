import type { BlockingSpec, FloorBlockRow } from './types';

export function resolveBlockingRows(
  spec: BlockingSpec,
  nBays: number,
  interRimDepthIn: number,
): FloorBlockRow[] {
  if (spec.mode === 'none') return [];

  if (spec.mode === 'half') {
    const d = spec.positionFraction * interRimDepthIn;
    const out: FloorBlockRow[] = [];
    for (let b = 0; b < nBays; b++) {
      out.push({ bayIndex: b, distanceFromFrontRimIn: d, spanFullWidth: false });
    }
    return out;
  }

  if (spec.mode === 'staggered') {
    const out: FloorBlockRow[] = [];
    for (let b = 0; b < nBays; b++) {
      const isDenseBay = (b % 2 === 0) === spec.startDense;
      const count = isDenseBay ? spec.denseCount : spec.sparseCount;
      for (let i = 0; i < count; i++) {
        const frac = (i + 1) / (count + 1);
        out.push({
          bayIndex: b,
          distanceFromFrontRimIn: frac * interRimDepthIn,
          spanFullWidth: false,
        });
      }
    }
    return out;
  }

  const out: FloorBlockRow[] = [];
  for (const r of spec.rows) {
    if (r.bayIndex < 0) {
      for (let b = 0; b < nBays; b++) {
        out.push({
          bayIndex: b,
          distanceFromFrontRimIn: r.positionFraction * interRimDepthIn,
          spanFullWidth: true,
        });
      }
    } else if (r.bayIndex < nBays) {
      out.push({
        bayIndex: r.bayIndex,
        distanceFromFrontRimIn: r.positionFraction * interRimDepthIn,
        spanFullWidth: false,
      });
    }
  }
  return out;
}
