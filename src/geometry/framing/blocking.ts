import type { BlockingSpec, BlockRow } from './types';

export function resolveBlockingRows(
  spec: BlockingSpec,
  nBays: number,
  interEndCapSpanIn: number,
): BlockRow[] {
  if (spec.mode === 'none') return [];

  if (spec.mode === 'half') {
    const d = spec.positionFraction * interEndCapSpanIn;
    const out: BlockRow[] = [];
    for (let b = 0; b < nBays; b++) {
      out.push({ bayIndex: b, positionFromEndCapAIn: d, spanFullLength: false });
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
          positionFromEndCapAIn: frac * interEndCapSpanIn,
          spanFullLength: false,
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
          positionFromEndCapAIn: r.positionFraction * interEndCapSpanIn,
          spanFullLength: true,
        });
      }
    } else if (r.bayIndex < nBays) {
      out.push({
        bayIndex: r.bayIndex,
        positionFromEndCapAIn: r.positionFraction * interEndCapSpanIn,
        spanFullLength: false,
      });
    }
  }
  return out;
}
