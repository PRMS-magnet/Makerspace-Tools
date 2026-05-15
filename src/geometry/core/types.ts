export type Vec2 = readonly [number, number];
export type Polygon = readonly Vec2[];

export type LaserOp = 'cut' | 'score' | 'engrave';

export const LASER_COLORS = {
  cut: '#cc0000',
  score: '#0000cc',
  engrave: '#000000',
} as const satisfies Record<LaserOp, string>;

export interface PolygonWithHoles {
  outline: Polygon;
  holes: readonly Polygon[];
}

export function isPolygonWithHoles(p: Polygon | PolygonWithHoles): p is PolygonWithHoles {
  return !Array.isArray(p) && typeof p === 'object' && p !== null && 'outline' in p && 'holes' in p;
}

export interface Piece {
  polygon: Polygon | PolygonWithHoles;
  op: LaserOp;
  label?: string;
  rotations?: readonly number[];
  placement?: PiecePlacement;
  extrudeDepthIn?: number;
  unitId?: string;
  engravedFeatures?: readonly Polygon[];
}

export interface PlacedPiece extends Piece {
  offsetIn: Vec2;
}

export interface Sheet {
  widthIn: number;
  heightIn?: number;
  marginIn: number;



  pieceSpacingIn?: number;
}

export interface LayoutResult {
  placed: PlacedPiece[];
  totalHeightIn: number;
  warnings: string[];
}

export interface SplitParams {
  pieceLengthIn: number;
  maxPieceLengthIn: number;
  stockThicknessIn: number;
  lapMultiplier?: number;
}

export interface SplitJoint {
  atIn: number;
  supportHintIn?: number;
}

export interface SplitResult {
  segments: number;
  segmentLengthIn: number;
  gussetLengthIn: number;
  gussetCount: number;
  joints: SplitJoint[];
}

export interface Joint {
  kind: 'butt-gusset';
  pieceALabel: string;
  pieceBLabel: string;
  gussetPolygon: Polygon;
  position: Vec2;
  supportRequired: boolean;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Piece3D extends Piece {
  origin: readonly [number, number, number];
  uAxis: readonly [number, number, number];
  vAxis: readonly [number, number, number];
  extrudeDepthIn: number;
}

export type PiecePlacement =
  | { kind: 'unit-rafter';      unitId: string; indexAlongRidge: number; side: 'north' | 'south' }
  | { kind: 'unit-ridge';       unitId: string; segmentIndex: number }
  | { kind: 'unit-joist';       unitId: string; indexAlongRidge: number }
  | { kind: 'unit-collar';      unitId: string; indexAlongRidge: number }
  | { kind: 'unit-top-plate';   unitId: string; side: 'north' | 'south' }
  | { kind: 'cross-gable-trimmer'; hostId: string; xAlongHostRidge: number }
  | { kind: 'unit-purlin';         unitId: string; side: 'north' | 'south' }
  | { kind: 'dormer-cheek-wall';   dormerId: string; side: 'east' | 'west' }
  | { kind: 'dormer-front-wall';   dormerId: string }
  | { kind: 'dormer-ridge';        dormerId: string }
  | { kind: 'dormer-rafter';       dormerId: string; indexAlongRidge: number; side: 'east' | 'west' }
  | { kind: 'dormer-valley-jack';  dormerId: string; indexAlongRidge: number; side: 'east' | 'west' }
  | { kind: 'dormer-rafter-plate'; dormerId: string; side: 'east' | 'west' }
  | { kind: 'dormer-cali-valley';  dormerId: string; side: 'east' | 'west' }
  | { kind: 'shed-dormer-cripple'; dormerId: string; indexAlongRidge: number }
  | { kind: 'shed-dormer-header';  dormerId: string }
  | { kind: 'wall-stud';         wallId: string; indexAlongWall: number }
  | { kind: 'wall-top-plate';    wallId: string; layer: 0 | 1 }
  | { kind: 'wall-bottom-plate'; wallId: string }
  | { kind: 'wall-block';        wallId: string; bayIndex: number; rowIndex: number }
  | { kind: 'wall-stud-mark';    wallId: string; indexAlongWall: number; plate: 'top' | 'bottom' }
  | { kind: 'floor-joist';       floorId: string; indexAlongWidth: number }
  | { kind: 'floor-rim';         floorId: string; side: 'front' | 'back' }
  | { kind: 'floor-block';       floorId: string; bayIndex: number; rowIndex: number }
  | { kind: 'splice-gusset';     hostKind: 'wall-plate' | 'floor-rim'; hostId: string; hostSubKey: string; positionAlongIn: number; spliceFace: 'top' | 'bottom' };
