import type { RoofParams } from '../roof/types';
import { roofParamsToUnit, roofParamsToSheet } from '../roof/types';
import type { Building } from './types';

export function simpleGablePreset(p: RoofParams): Building {
  return {
    units: [roofParamsToUnit(p, 'main')],
    intersections: [],
    ...roofParamsToSheet(p),
  };
}
