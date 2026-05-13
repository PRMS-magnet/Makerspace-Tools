import type { RoofUnit } from '../../roof/types';
import type { DormerShedPlacement, ComputeIntersectionResult, WindowOpening } from '../types';
import type { Piece, Polygon, PolygonWithHoles } from '../../core/types';

export interface DormerShedOptions {
  stockThicknessIn: number;
  kerfPerSideIn: number;
  fitMode: 'press' | 'slip';
}

export interface DormerShedGeom {
  xCenter: number;
  sideSign: 1 | -1;
  d_front: number;
  d_back: number;
  y_front: number;
  y_back: number;
  z_main_front: number;
  z_main_back: number;
  Z_front_plate: number;
  Z_header: number;
  L_along: number;
  m_host: number;
  m_sd: number;
  h_back: number;
  h_back_at_front: number;
  h_front_at_floor: number;
  h_at_front: number;
  slope_len: number;
  fits: boolean;
}

export function computeDormerShedGeom(host: RoofUnit, p: DormerShedPlacement): DormerShedGeom {
  const H = host.spanIn / 2;
  const m_host = host.pitchRise / host.pitchRun;
  const m_sd = p.pitchRise / p.pitchRun;
  const sideSign: 1 | -1 = p.side === 'south' ? -1 : 1;
  const d_back = p.yBackFromHostRidge;
  const d_front = p.yFrontFromHostRidge;
  const z_main_back = (H - d_back) * m_host;
  const z_main_front = (H - d_front) * m_host;
  const Z_front_plate = z_main_front + p.frontWallHeightIn;
  const L_along = Math.max(0, d_front - d_back);
  const Z_header = Z_front_plate + L_along * m_sd;
  const h_back = Math.max(0, Z_header - z_main_back);
  const h_back_at_front = Math.max(0, Z_front_plate - z_main_back);
  const h_front_at_floor = Math.max(0, z_main_front - z_main_back);
  const h_at_front = p.frontWallHeightIn;
  const slope_len = L_along / Math.cos(Math.atan(m_sd));
  const Z_main_ridge = H * m_host;
  const fits = d_back > 0 && d_front <= H && d_front > d_back && Z_header < Z_main_ridge && Z_header > Z_front_plate;
  return {
    xCenter: p.xAlongHostRidge,
    sideSign,
    d_front,
    d_back,
    y_front: sideSign * d_front,
    y_back: sideSign * d_back,
    z_main_front,
    z_main_back,
    Z_front_plate,
    Z_header,
    L_along,
    m_host,
    m_sd,
    h_back,
    h_back_at_front,
    h_front_at_floor,
    h_at_front,
    slope_len,
    fits,
  };
}

function cheekWallPolygon(g: DormerShedGeom): Polygon {
  return [
    [0, 0],
    [0, g.h_back],
    [g.L_along, g.h_back_at_front],
    [g.L_along, g.h_front_at_floor],
  ];
}

function frontWallPolygon(g: DormerShedGeom, W: number, window?: WindowOpening): Polygon | PolygonWithHoles {
  const rect: Polygon = [
    [0, 0],
    [W, 0],
    [W, g.h_at_front],
    [0, g.h_at_front],
  ];
  if (!window) return rect;
  const x0 = (W - window.widthIn) / 2;
  const y0 = window.sillIn;
  const hole: Polygon = [
    [x0, y0],
    [x0 + window.widthIn, y0],
    [x0 + window.widthIn, y0 + window.heightIn],
    [x0, y0 + window.heightIn],
  ];
  return { outline: rect, holes: [hole] };
}

function rectanglePolygon(width: number, height: number): Polygon {
  return [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
}

export function computeDormerShed(
  host: RoofUnit,
  placement: DormerShedPlacement,
  dormerId: string,
  opts: DormerShedOptions,
): ComputeIntersectionResult {
  const g = computeDormerShedGeom(host, placement);
  const W = placement.widthIn;
  const stock = opts.stockThicknessIn;
  const H = host.spanIn / 2;
  const newPieces: Piece[] = [];

  for (const side of ['east', 'west'] as const) {
    newPieces.push({
      polygon: cheekWallPolygon(g),
      op: 'cut',
      label: 'cheek-wall',
      placement: { kind: 'dormer-cheek-wall', dormerId, side },
      extrudeDepthIn: stock,
    });
  }

  newPieces.push({
    polygon: frontWallPolygon(g, W, placement.window),
    op: 'cut',
    label: 'front-wall',
    placement: { kind: 'dormer-front-wall', dormerId },
    extrudeDepthIn: stock,
  });

  newPieces.push({
    polygon: rectanglePolygon(W, stock),
    op: 'cut',
    label: 'dormer-header',
    placement: { kind: 'shed-dormer-header', dormerId },
    extrudeDepthIn: stock,
  });

  const spacing = host.rafterSpacingIn;
  const nRafters = Math.max(1, Math.floor(W / spacing) + 1);

  for (let i = 0; i < nRafters; i++) {
    newPieces.push({
      polygon: rectanglePolygon(g.slope_len, stock),
      op: 'cut',
      label: 'dormer-rafter',
      placement: { kind: 'dormer-rafter', dormerId, indexAlongRidge: i, side: 'east' },
      extrudeDepthIn: stock,
    });
  }

  const cripple_run = Math.max(0, g.d_back);
  const cripple_slope_length = cripple_run / Math.cos(Math.atan(g.m_host));

  for (let i = 0; i < nRafters; i++) {
    newPieces.push({
      polygon: rectanglePolygon(cripple_slope_length, stock),
      op: 'cut',
      label: 'cripple',
      placement: { kind: 'shed-dormer-cripple', dormerId, indexAlongRidge: i },
      extrudeDepthIn: stock,
    });
  }

  void H;

  return {
    newPieces,
    new3D: [],
    guestPiecesToReplace: [],
    hostPiecesToAdd: [],
    host3DToAdd: [],
    trimmerXPositions: [placement.xAlongHostRidge - W / 2, placement.xAlongHostRidge + W / 2],
    derived: {
      valleyLines: [],
      wingRidgeEndpoint: [placement.xAlongHostRidge, g.y_back, g.Z_header],
      wingRidgeLengthIn: g.L_along,
      jackCount: 0,
      trimmerExtraCount: 2,
    },
  };
}
