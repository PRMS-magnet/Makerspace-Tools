import type { BlockingSpec, BlockRow } from './types';

export function resolveBlockingRows(
  spec: BlockingSpec,
  nBays: number,
  interPlateHeightIn: number,
): BlockRow[] {
  if (spec.mode === 'none') return [];

  if (spec.mode === 'half') {
    const z = spec.heightFraction * interPlateHeightIn;
    const out: BlockRow[] = [];
    for (let b = 0; b < nBays; b++) {
      out.push({ bayIndex: b, heightFromBottomPlateIn: z, spanFullWidth: false });
    }
    return out;
  }

  if (spec.mode === 'staggered') {
    const out: BlockRow[] = [];
    for (let b = 0; b < nBays; b++) {
      const isDenseBay = (b % 2 === 0) === spec.startDense;
      const count = isDenseBay ? spec.denseCount : spec.sparseCount;
      for (let i = 0; i < count; i++) {
        const frac = (i + 1) / (count + 1);
        out.push({
          bayIndex: b,
          heightFromBottomPlateIn: frac * interPlateHeightIn,
          spanFullWidth: false,
        });
      }
    }
    return out;
  }

  const out: BlockRow[] = [];
  for (const r of spec.rows) {
    if (r.bayIndex < 0) {
      for (let b = 0; b < nBays; b++) {
        out.push({
          bayIndex: b,
          heightFromBottomPlateIn: r.heightFraction * interPlateHeightIn,
          spanFullWidth: true,
        });
      }
    } else if (r.bayIndex < nBays) {
      out.push({
        bayIndex: r.bayIndex,
        heightFromBottomPlateIn: r.heightFraction * interPlateHeightIn,
        spanFullWidth: false,
      });
    }
  }
  return out;
}
