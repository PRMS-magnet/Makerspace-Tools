import type { RoofUnit } from '../../roof/types';
import type { DormerGablePlacement, ComputeIntersectionResult } from '../types';
import type { Piece, Polygon } from '../../core/types';
import type { Line3 } from '../../core/plane';
import type { Vec3 } from '../../core/vec3';

export interface DormerGableOptions {
  stockThicknessIn: number;
  kerfPerSideIn: number;
  fitMode: 'press' | 'slip';
}

export interface DormerGableGeom {
  xCenter: number;
  y_front: number;
  z_main_front: number;
  Z_dormer_ridge: number;
  Z_cheek: number;
  Y_back: number;
  Y_valley_at_cheek: number;
  h_cheek: number;
  h_peak: number;
  m_host: number;
  m_d: number;
  L_cheek_horizontal: number;
  L_valley_horizontal: number;
  L_dormer_ridge: number;
}

export function computeDormerGableGeom(host: RoofUnit, p: DormerGablePlacement): DormerGableGeom {
  const H = host.spanIn / 2;
  const m_host = host.pitchRise / host.pitchRun;
  const m_d = p.pitchRise / p.pitchRun;
  const W = p.widthIn;
  const y_front = H - p.yFromHostRidge;
  const z_main_front = (H - y_front) * m_host;
  const Z_dormer_ridge = z_main_front + p.ridgeHeightIn;
  const Z_cheek = Z_dormer_ridge - (W / 2) * m_d;
  const Y_back = H - Z_dormer_ridge / m_host;
  const Y_valley_at_cheek = H - Z_cheek / m_host;
  const L_cheek_horizontal = y_front - Y_valley_at_cheek;
  const L_valley_horizontal = Math.hypot(W / 2, Y_valley_at_cheek - Y_back);
  return {
    xCenter: p.xAlongHostRidge,
    y_front,
    z_main_front,
    Z_dormer_ridge,
    Z_cheek,
    Y_back,
    Y_valley_at_cheek,
    h_cheek: Z_cheek - z_main_front,
    h_peak: Z_dormer_ridge - z_main_front,
    m_host,
    m_d,
    L_cheek_horizontal,
    L_valley_horizontal,
    L_dormer_ridge: y_front - Y_back,
  };
}

function cheekWallPolygon(g: DormerGableGeom): Polygon {
  return [
    [0, 0],
    [0, g.h_cheek],
    [g.L_cheek_horizontal, g.h_cheek],
  ];
}

function frontWallPolygon(g: DormerGableGeom, W: number): Polygon {
  return [
    [0, 0],
    [W, 0],
    [W, g.h_cheek],
    [W / 2, g.h_peak],
    [0, g.h_cheek],
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

function dormerCommonRafterPolygon(g: DormerGableGeom, W: number): Polygon {
  return [
    [0, 0],
    [W / 2, 0],
    [W / 2, g.h_peak - g.h_cheek],
  ];
}

function dormerValleyJackPolygon(g: DormerGableGeom, W: number, y_jack: number): Polygon {
  const span = g.Y_valley_at_cheek - g.Y_back;
  const t = span === 0 ? 0 : (g.Y_valley_at_cheek - y_jack) / span;
  const run_jack = (W / 2) * t;
  const rise_jack = run_jack * g.m_d;
  return [
    [0, 0],
    [run_jack, 0],
    [run_jack, rise_jack],
  ];
}

export function computeDormerGable(
  host: RoofUnit,
  placement: DormerGablePlacement,
  dormerId: string,
  opts: DormerGableOptions,
): ComputeIntersectionResult {
  const g = computeDormerGableGeom(host, placement);
  const W = placement.widthIn;
  const stock = opts.stockThicknessIn;
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
    polygon: rectanglePolygon(g.L_dormer_ridge, stock),
    op: 'cut',
    label: 'dormer-ridge',
    placement: { kind: 'dormer-ridge', dormerId },
    extrudeDepthIn: stock,
  });

  for (const side of ['east', 'west'] as const) {
    newPieces.push({
      polygon: rectanglePolygon(g.L_cheek_horizontal, stock),
      op: 'cut',
      label: 'rafter-plate',
      placement: { kind: 'dormer-rafter-plate', dormerId, side },
      extrudeDepthIn: stock,
    });
  }

  for (const side of ['east', 'west'] as const) {
    newPieces.push({
      polygon: rectanglePolygon(g.L_valley_horizontal, stock),
      op: 'cut',
      label: 'cali-valley',
      placement: { kind: 'dormer-cali-valley', dormerId, side },
      extrudeDepthIn: stock,
    });
  }

  const spacing = host.rafterSpacingIn;
  const eps = 1e-9;

  let jackIndex = 0;
  for (let y = g.Y_back; y <= g.Y_valley_at_cheek + eps; y += spacing) {
    if (y < g.Y_back - eps) continue;
    if (y > g.Y_valley_at_cheek + eps) break;
    for (const side of ['east', 'west'] as const) {
      newPieces.push({
        polygon: dormerValleyJackPolygon(g, W, y),
        op: 'cut',
        label: 'valley-jack',
        placement: { kind: 'dormer-valley-jack', dormerId, indexAlongRidge: jackIndex, side },
        extrudeDepthIn: stock,
      });
    }
    jackIndex++;
  }

  let commonIndex = 0;
  for (let y = g.Y_valley_at_cheek; y <= g.y_front + eps; y += spacing) {
    if (y < g.Y_valley_at_cheek - eps) continue;
    if (y > g.y_front + eps) break;
    for (const side of ['east', 'west'] as const) {
      newPieces.push({
        polygon: dormerCommonRafterPolygon(g, W),
        op: 'cut',
        label: 'dormer-rafter',
        placement: { kind: 'dormer-rafter', dormerId, indexAlongRidge: commonIndex, side },
        extrudeDepthIn: stock,
      });
    }
    commonIndex++;
  }

  const valleyLines: Line3[] = [];
  const wingRidgeEndpoint: Vec3 = [g.xCenter, g.Y_back, g.Z_dormer_ridge];

  return {
    newPieces,
    new3D: [],
    guestPiecesToReplace: [],
    hostPiecesToAdd: [],
    host3DToAdd: [],
    trimmerXPositions: [g.xCenter - W / 2, g.xCenter + W / 2],
    derived: {
      valleyLines,
      wingRidgeEndpoint,
      wingRidgeLengthIn: g.L_dormer_ridge,
      jackCount: jackIndex * 2,
      trimmerExtraCount: 2,
    },
  };
}
