import type { Piece, Piece3D } from './types';
import type { Building, DormerGablePlacement, DormerShedPlacement } from '../building/types';
import type { RoofUnit } from '../roof/types';
import { computeRoofGeometry } from '../roof/compute';
import { computeRoofCounts } from '../roof/cutlist';
import type { RoofCutlistOptions } from '../roof';
import type { Vec3 } from './vec3';
import { add3 } from './vec3';
import { computeDormerGableGeom, type DormerGableGeom } from '../building/intersect/dormer-gable';
import { computeDormerShedGeom, type DormerShedGeom } from '../building/intersect/dormer-shed';

export interface UnitFrame {
  unit: RoofUnit;
  translation: Vec3;
  rotationZRadians: number;
  nPairs: number;
  spacingIn: number;
  xOffset: number;
  ridgePieceLengthIn: number;
  nRidgePieces: number;
  ridgeBottomZ: number;
  ridgeLeftWorldX: number;
  stockThicknessIn: number;
  ridgeEndMarginIn: number;
  ridgeFaceMarginIn: number;
  riseAtCenterline: number;
}

export interface GableDormerFrame {
  kind: 'gable';
  hostId: string;
  hostFrame: UnitFrame;
  placement: DormerGablePlacement;
  geom: DormerGableGeom;
}

export interface ShedDormerFrame {
  kind: 'shed';
  hostId: string;
  hostFrame: UnitFrame;
  placement: DormerShedPlacement;
  geom: DormerShedGeom;
}

export type DormerFrame = GableDormerFrame | ShedDormerFrame;

export interface ResolveContext {
  building: Building;
  unitFrames: Map<string, UnitFrame>;
  dormerFrames: Map<string, DormerFrame>;
}

function unitPlacementFor(b: Building, unitIndex: number): { translation: Vec3; rotationZRadians: number } {
  if (unitIndex === 0) return { translation: [0, 0, 0], rotationZRadians: 0 };
  const inter = b.intersections[0];
  if (!inter) return { translation: [0, 0, 0], rotationZRadians: 0 };
  const host = b.units[0];
  const guest = b.units[1];
  if (inter.kind === 'cross-gable-T') {
    const xCenter = (inter.placement as { xAlongHostRidge: number }).xAlongHostRidge;
    return {
      translation: [xCenter, host.spanIn + guest.houseLengthIn / 2, 0],
      rotationZRadians: Math.PI / 2,
    };
  }
  if (inter.kind === 'cross-gable-L') {
    const corner = (inter.placement as { hostCorner: 'NW' | 'NE' | 'SW' | 'SE' }).hostCorner;
    switch (corner) {
      case 'NW': return { translation: [guest.spanIn / 2, host.spanIn + guest.houseLengthIn / 2, 0], rotationZRadians: Math.PI / 2 };
      case 'NE': return { translation: [host.houseLengthIn - guest.spanIn / 2, host.spanIn + guest.houseLengthIn / 2, 0], rotationZRadians: Math.PI / 2 };
      case 'SW': return { translation: [guest.spanIn / 2, -guest.houseLengthIn / 2, 0], rotationZRadians: -Math.PI / 2 };
      case 'SE': return { translation: [host.houseLengthIn - guest.spanIn / 2, -guest.houseLengthIn / 2, 0], rotationZRadians: -Math.PI / 2 };
    }
  }
  return { translation: [0, 0, 0], rotationZRadians: 0 };
}

function rotateZ(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

function applyUnitFrame(
  localOrigin: Vec3,
  localU: Vec3,
  localV: Vec3,
  frame: UnitFrame,
): { origin: Vec3; uAxis: Vec3; vAxis: Vec3 } {
  const angle = frame.rotationZRadians;
  if (angle === 0 &&
      frame.translation[0] === 0 &&
      frame.translation[1] === 0 &&
      frame.translation[2] === 0) {
    return { origin: localOrigin, uAxis: localU, vAxis: localV };
  }
  const origin = add3(rotateZ(localOrigin, angle), frame.translation);
  const uAxis = rotateZ(localU, angle);
  const vAxis = rotateZ(localV, angle);
  return { origin, uAxis, vAxis };
}

export function buildContext(b: Building, opts: RoofCutlistOptions): ResolveContext {
  const stockThicknessIn = opts.stockThicknessIn ?? 0.125;
  const ridgeEndMarginIn = opts.ridgeEndMarginIn ?? b.ridgeEndMarginIn ?? 0;
  const ridgeFaceMarginIn = opts.ridgeFaceMarginIn ?? b.ridgeFaceMarginIn ?? 0.125;

  const unitFrames = new Map<string, UnitFrame>();
  b.units.forEach((unit, idx) => {
    const params = {
      spanIn: unit.spanIn,
      pitchRise: unit.pitchRise,
      pitchRun: unit.pitchRun,
      rafterDepthIn: unit.rafterDepthIn,
      wallThicknessIn: unit.wallThicknessIn,
      overhangRunIn: unit.overhangRunIn,
      houseLengthIn: unit.houseLengthIn,
      rafterSpacingIn: unit.rafterSpacingIn,
      topPlateHeightIn: unit.topPlateHeightIn,
      nPairsOverride: unit.nPairsOverride,
      sheetWidthIn: b.sheetWidthIn,
      maxPieceLengthIn: b.maxPieceLengthIn,
      marginIn: b.marginIn,
      pieceSpacingIn: b.pieceSpacingIn,
      ridgeEndMarginIn,
      ridgeFaceMarginIn,
    };
    const geom = computeRoofGeometry(params, stockThicknessIn);
    const counts = computeRoofCounts(params, stockThicknessIn, ridgeEndMarginIn);
    const houseLen = (counts.nPairs - 1) * unit.rafterSpacingIn;
    const xOffset = -houseLen / 2;
    const ridgeLeftWorldX = xOffset - ridgeEndMarginIn;

    const yBotR = geom.tanT * (geom.R - unit.wallThicknessIn);
    const ridgeBottomZ = yBotR - ridgeFaceMarginIn;

    const placement = unitPlacementFor(b, idx);
    unitFrames.set(unit.id, {
      unit,
      translation: placement.translation,
      rotationZRadians: placement.rotationZRadians,
      nPairs: counts.nPairs,
      spacingIn: unit.rafterSpacingIn,
      xOffset,
      ridgePieceLengthIn: counts.ridgePieceLengthIn,
      nRidgePieces: counts.nRidgePieces,
      ridgeBottomZ,
      ridgeLeftWorldX,
      stockThicknessIn,
      ridgeEndMarginIn,
      ridgeFaceMarginIn,
      riseAtCenterline: geom.riseAtCenterline,
    });
  });

  const dormerFrames = new Map<string, DormerFrame>();
  for (const inter of b.intersections) {
    if (inter.kind === 'dormer-gable') {
      const placement = inter.placement as DormerGablePlacement;
      const hostFrame = unitFrames.get(placement.hostId);
      if (!hostFrame) continue;
      dormerFrames.set(inter.id, {
        kind: 'gable',
        hostId: placement.hostId,
        hostFrame,
        placement,
        geom: computeDormerGableGeom(hostFrame.unit, placement),
      });
    } else if (inter.kind === 'dormer-shed') {
      const placement = inter.placement as DormerShedPlacement;
      const hostFrame = unitFrames.get(placement.hostId);
      if (!hostFrame) continue;
      dormerFrames.set(inter.id, {
        kind: 'shed',
        hostId: placement.hostId,
        hostFrame,
        placement,
        geom: computeDormerShedGeom(hostFrame.unit, placement),
      });
    }
  }

  return { building: b, unitFrames, dormerFrames };
}

const RAFTER_U: Vec3 = [0, 1, 0];
const RAFTER_V: Vec3 = [0, 0, 1];
const RIDGE_U: Vec3 = [1, 0, 0];
const RIDGE_V: Vec3 = [0, 0, 1];

export function resolvePiece(piece: Piece, ctx: ResolveContext): Piece3D {
  if (!piece.placement) {
    throw new Error('resolvePiece: piece has no placement');
  }
  const p = piece.placement;
  switch (p.kind) {
    case 'unit-rafter':
    case 'unit-joist':
    case 'unit-collar': {
      const f = ctx.unitFrames.get(p.unitId);
      if (!f) throw new Error(`resolvePiece: no unit frame for ${p.unitId}`);
      const xLocal = f.xOffset + p.indexAlongRidge * f.spacingIn;
      const localOrigin: Vec3 = [xLocal, 0, 0];
      const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, RAFTER_U, RAFTER_V, f);
      return {
        ...piece,
        origin,
        uAxis,
        vAxis,
        extrudeDepthIn: piece.extrudeDepthIn ?? f.stockThicknessIn,
      };
    }
    case 'unit-ridge': {
      const f = ctx.unitFrames.get(p.unitId);
      if (!f) throw new Error(`resolvePiece: no unit frame for ${p.unitId}`);
      const segStart = f.ridgeLeftWorldX + p.segmentIndex * f.ridgePieceLengthIn;
      const localOrigin: Vec3 = [segStart, f.stockThicknessIn / 2, f.ridgeBottomZ];
      const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, RIDGE_U, RIDGE_V, f);
      return {
        ...piece,
        origin,
        uAxis,
        vAxis,
        extrudeDepthIn: piece.extrudeDepthIn ?? f.stockThicknessIn,
      };
    }
    case 'dormer-cheek-wall': {
      const f = ctx.dormerFrames.get(p.dormerId);
      if (!f) throw new Error(`resolvePiece: no dormer frame for ${p.dormerId}`);
      const xSign = p.side === 'east' ? +1 : -1;
      if (f.kind === 'gable') {
        const localOrigin: Vec3 = [
          f.placement.xAlongHostRidge + xSign * f.placement.widthIn / 2,
          f.geom.y_front,
          f.geom.z_main_front,
        ];
        const localU: Vec3 = [0, -1, 0];
        const localV: Vec3 = [0, 0, 1];
        const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
        return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? f.hostFrame.stockThicknessIn };
      } else {
        const localOrigin: Vec3 = [
          f.placement.xAlongHostRidge + xSign * f.placement.widthIn / 2,
          f.geom.y_back,
          f.geom.z_main_back,
        ];
        const localU: Vec3 = [0, -1, 0];
        const localV: Vec3 = [0, 0, 1];
        const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
        return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? f.hostFrame.stockThicknessIn };
      }
    }
    case 'dormer-front-wall': {
      const f = ctx.dormerFrames.get(p.dormerId);
      if (!f) throw new Error(`resolvePiece: no dormer frame for ${p.dormerId}`);
      if (f.kind === 'gable') {
        const localOrigin: Vec3 = [
          f.placement.xAlongHostRidge - f.placement.widthIn / 2,
          f.geom.y_front,
          f.geom.z_main_front,
        ];
        const localU: Vec3 = [1, 0, 0];
        const localV: Vec3 = [0, 0, 1];
        const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
        return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? f.hostFrame.stockThicknessIn };
      } else {
        const localOrigin: Vec3 = [
          f.placement.xAlongHostRidge - f.placement.widthIn / 2,
          f.geom.y_front,
          f.geom.z_main_front,
        ];
        const localU: Vec3 = [1, 0, 0];
        const localV: Vec3 = [0, 0, 1];
        const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
        return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? f.hostFrame.stockThicknessIn };
      }
    }
    case 'dormer-ridge': {
      const f = ctx.dormerFrames.get(p.dormerId);
      if (!f) throw new Error(`resolvePiece: no dormer frame for ${p.dormerId}`);
      if (f.kind !== 'gable') throw new Error(`resolvePiece: dormer-ridge requires gable dormer`);
      const stock = f.hostFrame.stockThicknessIn;
      const localOrigin: Vec3 = [
        f.placement.xAlongHostRidge - stock / 2,
        f.geom.Y_back,
        f.geom.Z_dormer_ridge - stock,
      ];
      const localU: Vec3 = [0, 1, 0];
      const localV: Vec3 = [0, 0, 1];
      const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
      return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? stock };
    }
    case 'dormer-rafter': {
      const f = ctx.dormerFrames.get(p.dormerId);
      if (!f) throw new Error(`resolvePiece: no dormer frame for ${p.dormerId}`);
      if (f.kind === 'gable') {
        const xSign = p.side === 'east' ? +1 : -1;
        const y_pos = f.geom.Y_valley_at_cheek + p.indexAlongRidge * f.hostFrame.unit.rafterSpacingIn;
        const localOrigin: Vec3 = [
          f.placement.xAlongHostRidge + xSign * f.placement.widthIn / 2,
          y_pos,
          f.geom.Z_cheek,
        ];
        const localU: Vec3 = [-xSign, 0, 0];
        const localV: Vec3 = [0, 0, 1];
        const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
        return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? f.hostFrame.stockThicknessIn };
      } else {
        const x_pos = f.placement.xAlongHostRidge - f.placement.widthIn / 2
          + p.indexAlongRidge * f.hostFrame.unit.rafterSpacingIn;
        const localOrigin: Vec3 = [x_pos, f.geom.y_front, f.geom.Z_front_plate];
        const dy = f.geom.L_along;
        const dz = f.geom.L_along * f.geom.m_sd;
        const slope_len = Math.hypot(dy, dz);
        const localU: Vec3 = [0, dy / slope_len, dz / slope_len];
        const localV: Vec3 = [0, 0, 1];
        const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
        return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? f.hostFrame.stockThicknessIn };
      }
    }
    case 'dormer-valley-jack': {
      const f = ctx.dormerFrames.get(p.dormerId);
      if (!f) throw new Error(`resolvePiece: no dormer frame for ${p.dormerId}`);
      if (f.kind !== 'gable') throw new Error(`resolvePiece: dormer-valley-jack requires gable dormer`);
      const xSign = p.side === 'east' ? +1 : -1;
      const y_pos = f.geom.Y_back + p.indexAlongRidge * f.hostFrame.unit.rafterSpacingIn;
      const span = f.geom.Y_valley_at_cheek - f.geom.Y_back;
      const t = span === 0 ? 0 : (f.geom.Y_valley_at_cheek - y_pos) / span;
      const x_valley = f.placement.xAlongHostRidge + xSign * (f.placement.widthIn / 2) * t;
      const z_valley = f.geom.Z_dormer_ridge - Math.abs(x_valley - f.placement.xAlongHostRidge) * f.geom.m_d;
      const localOrigin: Vec3 = [x_valley, y_pos, z_valley];
      const localU: Vec3 = [-xSign, 0, 0];
      const localV: Vec3 = [0, 0, 1];
      const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
      return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? f.hostFrame.stockThicknessIn };
    }
    case 'dormer-rafter-plate': {
      const f = ctx.dormerFrames.get(p.dormerId);
      if (!f) throw new Error(`resolvePiece: no dormer frame for ${p.dormerId}`);
      if (f.kind !== 'gable') throw new Error(`resolvePiece: dormer-rafter-plate requires gable dormer`);
      const xSign = p.side === 'east' ? +1 : -1;
      const localOrigin: Vec3 = [
        f.placement.xAlongHostRidge + xSign * f.placement.widthIn / 2,
        f.geom.Y_valley_at_cheek,
        f.geom.Z_cheek,
      ];
      const localU: Vec3 = [0, 1, 0];
      const localV: Vec3 = [0, 0, 1];
      const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
      return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? f.hostFrame.stockThicknessIn };
    }
    case 'dormer-cali-valley': {
      const f = ctx.dormerFrames.get(p.dormerId);
      if (!f) throw new Error(`resolvePiece: no dormer frame for ${p.dormerId}`);
      if (f.kind !== 'gable') throw new Error(`resolvePiece: dormer-cali-valley requires gable dormer`);
      const xSign = p.side === 'east' ? +1 : -1;
      const localOrigin: Vec3 = [
        f.placement.xAlongHostRidge + xSign * f.placement.widthIn / 2,
        f.geom.Y_valley_at_cheek,
        f.geom.Z_cheek,
      ];
      const dx = -xSign * f.placement.widthIn / 2;
      const dy = f.geom.Y_back - f.geom.Y_valley_at_cheek;
      const len = Math.hypot(dx, dy);
      const localU: Vec3 = len === 0 ? [1, 0, 0] : [dx / len, dy / len, 0];
      const localV: Vec3 = [0, 0, 1];
      const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
      return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? f.hostFrame.stockThicknessIn };
    }
    case 'shed-dormer-cripple': {
      const f = ctx.dormerFrames.get(p.dormerId);
      if (!f) throw new Error(`resolvePiece: no dormer frame for ${p.dormerId}`);
      if (f.kind !== 'shed') throw new Error(`resolvePiece: shed-dormer-cripple requires shed dormer`);
      const H = f.hostFrame.unit.spanIn / 2;
      const x_pos = f.placement.xAlongHostRidge - f.placement.widthIn / 2
        + p.indexAlongRidge * f.hostFrame.unit.rafterSpacingIn;
      const localOrigin: Vec3 = [x_pos, H, H * f.geom.m_host];
      const dy = f.geom.y_back - H;
      const dz = f.geom.z_main_back - H * f.geom.m_host;
      const slope_len = Math.hypot(dy, dz);
      const localU: Vec3 = slope_len === 0 ? [0, 1, 0] : [0, dy / slope_len, dz / slope_len];
      const localV: Vec3 = [0, 0, 1];
      const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
      return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? f.hostFrame.stockThicknessIn };
    }
    case 'shed-dormer-header': {
      const f = ctx.dormerFrames.get(p.dormerId);
      if (!f) throw new Error(`resolvePiece: no dormer frame for ${p.dormerId}`);
      if (f.kind !== 'shed') throw new Error(`resolvePiece: shed-dormer-header requires shed dormer`);
      const localOrigin: Vec3 = [
        f.placement.xAlongHostRidge - f.placement.widthIn / 2,
        f.geom.y_back,
        f.geom.Z_header,
      ];
      const localU: Vec3 = [1, 0, 0];
      const localV: Vec3 = [0, 0, 1];
      const { origin, uAxis, vAxis } = applyUnitFrame(localOrigin, localU, localV, f.hostFrame);
      return { ...piece, origin, uAxis, vAxis, extrudeDepthIn: piece.extrudeDepthIn ?? f.hostFrame.stockThicknessIn };
    }
    case 'unit-top-plate':
    case 'cross-gable-trimmer':
    case 'unit-purlin':
      throw new Error(`resolvePiece: kind '${p.kind}' is not yet implemented (reserved for later cycle)`);
  }
}

export function resolvePieces(pieces: readonly Piece[], ctx: ResolveContext): Piece3D[] {
  return pieces.map((piece) => resolvePiece(piece, ctx));
}
