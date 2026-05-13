import type { RoofUnit, SheetParams, RoofDerived } from '../roof/types';
import type { Piece, Piece3D, Sheet } from '../core/types';
import type { Line3 } from '../core/plane';
import type { Vec3 } from '../core/vec3';

export type IntersectionKind =
  | 'cross-gable-T'
  | 'cross-gable-L'
  | 'dormer-gable'
  | 'dormer-shed';

export interface CrossGableTPlacement {
  xAlongHostRidge: number;
}

export interface CrossGableLPlacement {
  hostCorner: 'NW' | 'NE' | 'SW' | 'SE';
}

export interface WindowOpening {
  widthIn: number;
  heightIn: number;
  sillIn: number;
}

export interface DormerGablePlacement {
  hostId: string;
  xAlongHostRidge: number;
  yFromHostRidge: number;
  widthIn: number;
  ridgeHeightIn: number;
  pitchRise: number;
  pitchRun: number;
  side: 'north' | 'south';
  window?: WindowOpening;
}

export interface DormerShedPlacement {
  hostId: string;
  xAlongHostRidge: number;
  yBackFromHostRidge: number;
  yFrontFromHostRidge: number;
  widthIn: number;
  frontWallHeightIn: number;
  pitchRise: number;
  pitchRun: number;
  side: 'north' | 'south';
  window?: WindowOpening;
}

export type IntersectionPlacement =
  | CrossGableTPlacement
  | CrossGableLPlacement
  | DormerGablePlacement
  | DormerShedPlacement;

export interface Intersection {
  id: string;
  hostId: string;
  guestId: string;
  kind: IntersectionKind;
  placement: IntersectionPlacement;
}

export interface Building extends SheetParams {
  units: RoofUnit[];
  intersections: Intersection[];
}

export interface IntersectionDerived {
  valleyLines: Line3[];
  wingRidgeEndpoint: Vec3;
  wingRidgeLengthIn: number;
  jackCount: number;
  trimmerExtraCount: number;
}

export interface BuildingDerived {
  perUnit: Record<string, RoofDerived>;
  perIntersection: Record<string, IntersectionDerived>;
}

export interface BuildingOutput {
  cutSvg: string;
  cutSvgs: string[];
  diagramSvg: string;
  planDiagramSvg: string;
  derived: BuildingDerived;
  warnings: string[];
  pieces3D: Piece3D[];
  pieces: Piece[];
  sheet: Sheet;
}

export interface ComputeIntersectionResult {
  newPieces: Piece[];
  new3D: Piece3D[];
  guestPiecesToReplace: string[];
  hostPiecesToAdd: Piece[];
  host3DToAdd: Piece3D[];
  derived: IntersectionDerived;
  trimmerXPositions?: number[];
}
