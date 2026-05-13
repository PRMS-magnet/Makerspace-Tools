import type { RoofUnit } from '../../roof/types';
import type { DormerGablePlacement, ComputeIntersectionResult, WindowOpening } from '../types';
import type { Piece, Polygon, PolygonWithHoles } from '../../core/types';
import type { Line3 } from '../../core/plane';
import type { Vec3 } from '../../core/vec3';

export interface DormerGableOptions {
  stockThicknessIn: number;
  kerfPerSideIn: number;
  fitMode: 'press' | 'slip';
}

export interface DormerGableGeom {
  xCenter: number;
  sideSign: 1 | -1;
  d_front: number;
  d_back: number;
  d_valley_at_cheek: number;
  y_front: number;
  y_back: number;
  y_valley_at_cheek: number;
  z_main_front: number;
  Z_dormer_ridge: number;
  Z_cheek: number;
  h_cheek: number;
  h_peak: number;
  m_host: number;
  m_d: number;
  L_cheek_horizontal: number;
  L_valley_horizontal: number;
  L_dormer_ridge: number;
  fits: boolean;
}

export function computeDormerGableGeom(host: RoofUnit, p: DormerGablePlacement): DormerGableGeom {
  const H = host.spanIn / 2;
  const m_host = host.pitchRise / host.pitchRun;
  const m_d = p.pitchRise / p.pitchRun;
  const W = p.widthIn;
  const sideSign: 1 | -1 = p.side === 'south' ? -1 : 1;
  const d_front = p.yFromHostRidge;
  const z_main_front = (H - d_front) * m_host;
  const Z_dormer_ridge = z_main_front + p.ridgeHeightIn;
  const Z_cheek = Z_dormer_ridge - (W / 2) * m_d;
  const d_back = H - Z_dormer_ridge / m_host;
  const d_valley_at_cheek = H - Z_cheek / m_host;
  const L_cheek_horizontal = Math.max(0, d_front - d_valley_at_cheek);
  const L_valley_horizontal = Math.hypot(W / 2, Math.max(0, d_valley_at_cheek - d_back));
  const L_dormer_ridge = Math.max(0, d_front - d_back);
  const Z_main_ridge = H * m_host;
  const fits = Z_dormer_ridge < Z_main_ridge
    && d_back > 0
    && d_valley_at_cheek < d_front
    && d_valley_at_cheek > d_back
    && Z_cheek > z_main_front;
  return {
    xCenter: p.xAlongHostRidge,
    sideSign,
    d_front,
    d_back,
    d_valley_at_cheek,
    y_front: sideSign * d_front,
    y_back: sideSign * d_back,
    y_valley_at_cheek: sideSign * d_valley_at_cheek,
    z_main_front,
    Z_dormer_ridge,
    Z_cheek,
    h_cheek: Z_cheek - z_main_front,
    h_peak: Z_dormer_ridge - z_main_front,
    m_host,
    m_d,
    L_cheek_horizontal,
    L_valley_horizontal,
    L_dormer_ridge,
    fits,
  };
}

function cheekWallPolygon(g: DormerGableGeom): Polygon {
  return [
    [0, 0],
    [0, g.h_cheek],
    [g.L_cheek_horizontal, g.h_cheek],
  ];
}

function frontWallPolygon(g: DormerGableGeom, W: number, window?: WindowOpening): Polygon | PolygonWithHoles {
  const pentagon: Polygon = [
    [0, 0],
    [W, 0],
    [W, g.h_cheek],
    [W / 2, g.h_peak],
    [0, g.h_cheek],
  ];
  if (!window) return pentagon;
  const x0 = (W - window.widthIn) / 2;
  const y0 = window.sillIn;
  const hole: Polygon = [
    [x0, y0],
    [x0 + window.widthIn, y0],
    [x0 + window.widthIn, y0 + window.heightIn],
    [x0, y0 + window.heightIn],
  ];
  return { outline: pentagon, holes: [hole] };
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
  const rise = Math.max(0, g.h_peak - g.h_cheek);
  return [
    [0, 0],
    [W / 2, 0],
    [W / 2, rise],
  ];
}

function dormerValleyJackPolygon(g: DormerGableGeom, W: number, d_jack: number): Polygon {
  const span = g.d_valley_at_cheek - g.d_back;
  const t = span <= 0 ? 0 : (g.d_valley_at_cheek - d_jack) / span;
  const run_jack = Math.max(0, (W / 2) * t);
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
    polygon: frontWallPolygon(g, W, placement.window),
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
  for (let d = g.d_back; d <= g.d_valley_at_cheek + eps; d += spacing) {
    if (d < g.d_back - eps) continue;
    if (d > g.d_valley_at_cheek + eps) break;
    for (const side of ['east', 'west'] as const) {
      newPieces.push({
        polygon: dormerValleyJackPolygon(g, W, d),
        op: 'cut',
        label: 'valley-jack',
        placement: { kind: 'dormer-valley-jack', dormerId, indexAlongRidge: jackIndex, side },
        extrudeDepthIn: stock,
      });
    }
    jackIndex++;
  }

  let commonIndex = 0;
  for (let d = g.d_valley_at_cheek; d <= g.d_front + eps; d += spacing) {
    if (d < g.d_valley_at_cheek - eps) continue;
    if (d > g.d_front + eps) break;
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
  const wingRidgeEndpoint: Vec3 = [g.xCenter, g.y_back, g.Z_dormer_ridge];

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
