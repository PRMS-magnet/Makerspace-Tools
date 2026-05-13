import type { Piece, Piece3D } from './types';
import type { Building } from '../building/types';
import type { RoofUnit } from '../roof/types';
import { computeRoofGeometry } from '../roof/compute';
import { computeRoofCounts } from '../roof/cutlist';
import type { RoofCutlistOptions } from '../roof';
import type { Vec3 } from './vec3';
import { add3 } from './vec3';

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

export interface ResolveContext {
  building: Building;
  unitFrames: Map<string, UnitFrame>;
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

  return { building: b, unitFrames };
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
    case 'unit-top-plate':
    case 'cross-gable-trimmer':
    case 'unit-purlin':
    case 'dormer-cheek-wall':
    case 'dormer-front-wall':
    case 'dormer-ridge':
    case 'dormer-rafter':
    case 'dormer-valley-jack':
    case 'dormer-rafter-plate':
    case 'dormer-cali-valley':
    case 'shed-dormer-cripple':
    case 'shed-dormer-header':
      throw new Error(`resolvePiece: kind '${p.kind}' is not yet implemented (reserved for later cycle)`);
  }
}

export function resolvePieces(pieces: readonly Piece[], ctx: ResolveContext): Piece3D[] {
  return pieces.map((piece) => resolvePiece(piece, ctx));
}
