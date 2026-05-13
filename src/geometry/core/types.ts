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





export interface Piece3D {
  polygon: Polygon | PolygonWithHoles;
  origin: readonly [number, number, number];
  uAxis: readonly [number, number, number];
  vAxis: readonly [number, number, number];
  extrudeDepthIn: number;
  label?: string;
  op?: LaserOp;
}
