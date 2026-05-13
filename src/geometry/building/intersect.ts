import type { RoofUnit } from '../roof/types';
import type {
  Intersection,
  ComputeIntersectionResult,
  CrossGableTPlacement,
  CrossGableLPlacement,
} from './types';
import { computeCrossGableT } from './intersect/cross-gable-t';
import { computeCrossGableL } from './intersect/cross-gable-l';

export interface ComputeIntersectionOptions {
  stockThicknessIn: number;
  kerfPerSideIn: number;
  fitMode: 'press' | 'slip';
}

export function computeIntersection(
  host: RoofUnit,
  guest: RoofUnit,
  intersection: Intersection,
  opts: ComputeIntersectionOptions,
): ComputeIntersectionResult {
  switch (intersection.kind) {
    case 'cross-gable-T':
      return computeCrossGableT(host, guest, intersection.placement as CrossGableTPlacement, opts);
    case 'cross-gable-L':
      return computeCrossGableL(host, guest, intersection.placement as CrossGableLPlacement, opts);
    case 'dormer-gable':
    case 'dormer-shed':
      throw new Error(`${intersection.kind} not yet implemented (Cycle B)`);
  }
}
