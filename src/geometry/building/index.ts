export { buildingCutlist } from './compose';
export {
  simpleGablePreset,
  lPlanPreset,
  tPlanPreset,
  BUILTIN_BUILDING_PRESETS,
} from './presets';
export { buildPlanDiagram } from './diagram';
export { unitPlacement } from './place3d';
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
export type { UnitPlacement } from './place3d';
