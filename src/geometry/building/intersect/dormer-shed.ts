import type { RoofUnit } from '../../roof/types';
import type { DormerShedPlacement, ComputeIntersectionResult } from '../types';
import type { Piece, Polygon } from '../../core/types';

export interface DormerShedOptions {
  stockThicknessIn: number;
  kerfPerSideIn: number;
  fitMode: 'press' | 'slip';
}

export interface DormerShedGeom {
  xCenter: number;
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
}

export function computeDormerShedGeom(host: RoofUnit, p: DormerShedPlacement): DormerShedGeom {
  const H = host.spanIn / 2;
  const m_host = host.pitchRise / host.pitchRun;
  const m_sd = p.pitchRise / p.pitchRun;
  const y_back = H - p.yBackFromHostRidge;
  const y_front = H - p.yFrontFromHostRidge;
  const z_main_back = (H - y_back) * m_host;
  const z_main_front = (H - y_front) * m_host;
  const Z_front_plate = z_main_front + p.frontWallHeightIn;
  const Z_header = Z_front_plate + (p.yFrontFromHostRidge - p.yBackFromHostRidge) * m_sd;
  const L_along = y_back - y_front;
  const h_back = Z_header - z_main_back;
  const h_back_at_front = Z_front_plate - z_main_back;
  const h_front_at_floor = z_main_front - z_main_back;
  const h_at_front = p.frontWallHeightIn;
  const slope_len = L_along / Math.cos(Math.atan(m_sd));
  return {
    xCenter: p.xAlongHostRidge,
    y_front,
    y_back,
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

function frontWallPolygon(g: DormerShedGeom, W: number): Polygon {
  return [
    [0, 0],
    [W, 0],
    [W, g.h_at_front],
    [0, g.h_at_front],
  ];
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
    polygon: frontWallPolygon(g, W),
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

  const cripple_run = H - g.y_back;
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
