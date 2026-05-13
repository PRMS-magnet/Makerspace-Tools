import type { RoofUnit } from '../roof/types';
import type {
  Intersection,
  ComputeIntersectionResult,
  CrossGableTPlacement,
  CrossGableLPlacement,
  DormerGablePlacement,
  DormerShedPlacement,
} from './types';
import { computeCrossGableT } from './intersect/cross-gable-t';
import { computeCrossGableL } from './intersect/cross-gable-l';
import { computeDormerGable } from './intersect/dormer-gable';
import { computeDormerShed } from './intersect/dormer-shed';

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
      return computeDormerGable(host, intersection.placement as DormerGablePlacement, intersection.id, opts);
    case 'dormer-shed':
      return computeDormerShed(host, intersection.placement as DormerShedPlacement, intersection.id, opts);
  }
}
