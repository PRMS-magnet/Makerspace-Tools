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

export interface BuildingPreset {
  id: string;
  name: string;
  shape: 'simple' | 'l-plan' | 't-plan';
  building: Building;
}

const COMMON: Omit<UnitWithSheet, 'spanIn' | 'pitchRise' | 'pitchRun' | 'houseLengthIn'> = {
  rafterDepthIn: 0.5,
  wallThicknessIn: 0.25,
  overhangRunIn: 0.5,
  rafterSpacingIn: 0.875,
  topPlateHeightIn: 0.25,
  nPairsOverride: null,
  sheetWidthIn: 12,
  maxPieceLengthIn: 12,
  marginIn: 0.12,
};

export const BUILTIN_BUILDING_PRESETS: readonly BuildingPreset[] = [
  {
    id: 'l-plan-cottage',
    name: '1:18 L-plan cottage',
    shape: 'l-plan',
    building: lPlanPreset(
      { ...COMMON, spanIn: 12, pitchRise: 8, pitchRun: 12, houseLengthIn: 18 },
      { ...COMMON, spanIn: 12, pitchRise: 8, pitchRun: 12, houseLengthIn: 12 },
      'NW',
    ),
  },
  {
    id: 't-plan-farmhouse',
    name: '1:18 T-plan farmhouse',
    shape: 't-plan',
    building: tPlanPreset(
      { ...COMMON, spanIn: 12, pitchRise: 6, pitchRun: 12, houseLengthIn: 24 },
      { ...COMMON, spanIn: 8, pitchRise: 6, pitchRun: 12, houseLengthIn: 10 },
      12,
    ),
  },
  {
    id: 'cross-gable-cape',
    name: '1:18 cross-gable Cape',
    shape: 't-plan',
    building: tPlanPreset(
      { ...COMMON, spanIn: 14, pitchRise: 10, pitchRun: 12, houseLengthIn: 20 },
      { ...COMMON, spanIn: 8, pitchRise: 8, pitchRun: 12, houseLengthIn: 8 },
      10,
    ),
  },
];

