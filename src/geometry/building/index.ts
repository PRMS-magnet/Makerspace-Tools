export { buildingCutlist } from './compose';
export {
  simpleGablePreset,
  lPlanPreset,
  tPlanPreset,
  BUILTIN_BUILDING_PRESETS,
} from './presets';
export { buildPlanDiagram } from './diagram';
export { computeIntersection } from './intersect';

export type {
  Building,
  Intersection,
  IntersectionKind,
  IntersectionPlacement,
  CrossGableTPlacement,
  CrossGableLPlacement,
  BuildingOutput,
  BuildingDerived,
  IntersectionDerived,
  ComputeIntersectionResult,
} from './types';
export type { BuildingPreset, UnitWithSheet } from './presets';
