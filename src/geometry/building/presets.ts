import type { RoofParams, RoofUnit, SheetParams } from '../roof/types';
import { roofParamsToUnit, roofParamsToSheet } from '../roof/types';
import type { Building } from './types';

export function simpleGablePreset(p: RoofParams): Building {
  return {
    units: [roofParamsToUnit(p, 'main')],
    intersections: [],
    ...roofParamsToSheet(p),
  };
}

export type UnitWithSheet = Omit<RoofUnit, 'id'> & SheetParams;

function stripSheet(p: UnitWithSheet): Omit<RoofUnit, 'id'> {
  const {
    sheetWidthIn: _sheetWidthIn,
    maxPieceLengthIn: _maxPieceLengthIn,
    marginIn: _marginIn,
    pieceSpacingIn: _pieceSpacingIn,
    ridgeEndMarginIn: _ridgeEndMarginIn,
    ridgeFaceMarginIn: _ridgeFaceMarginIn,
    ...rest
  } = p;
  return rest;
}

function sheetFrom(p: SheetParams): SheetParams {
  return {
    sheetWidthIn: p.sheetWidthIn,
    maxPieceLengthIn: p.maxPieceLengthIn,
    marginIn: p.marginIn,
    pieceSpacingIn: p.pieceSpacingIn,
    ridgeEndMarginIn: p.ridgeEndMarginIn,
    ridgeFaceMarginIn: p.ridgeFaceMarginIn,
  };
}

export function lPlanPreset(
  main: UnitWithSheet,
  wing: UnitWithSheet,
  hostCorner: 'NW' | 'NE' | 'SW' | 'SE',
): Building {
  return {
    units: [
      { id: 'main', ...stripSheet(main) },
      { id: 'wing', ...stripSheet(wing) },
    ],
    intersections: [{
      id: 'i1', hostId: 'main', guestId: 'wing',
      kind: 'cross-gable-L', placement: { hostCorner },
    }],
    ...sheetFrom(main),
  };
}

export function tPlanPreset(
  main: UnitWithSheet,
  wing: UnitWithSheet,
  xAlongHostRidge: number,
): Building {
  return {
    units: [
      { id: 'main', ...stripSheet(main) },
      { id: 'wing', ...stripSheet(wing) },
    ],
    intersections: [{
      id: 'i1', hostId: 'main', guestId: 'wing',
      kind: 'cross-gable-T', placement: { xAlongHostRidge },
    }],
    ...sheetFrom(main),
  };
}
