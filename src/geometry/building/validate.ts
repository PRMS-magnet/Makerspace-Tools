import type { Building, Intersection, DormerGablePlacement, DormerShedPlacement, WindowOpening } from './types';

export interface ValidationWarning {
  message: string;
  severity: 'info' | 'warn';
  intersectionId?: string;
}

const MIN_RIDGE_SETBACK_IN = 1.0;
const MIN_EAVE_SETBACK_IN = 0.67;
const MAX_GABLE_DORMERS_PER_SLOPE = 3;
const MAX_SHED_DORMERS_PER_SLOPE = 2;
const MAX_DORMER_WIDTH_RATIO = 1 / 3;

function validateWindowOpening(interId: string, w: WindowOpening, parentWidthIn: number, h_front: number): ValidationWarning[] {
  const ws: ValidationWarning[] = [];
  if (w.widthIn > parentWidthIn - 0.66) {
    ws.push({ message: `Window in dormer ${interId} too wide: leave at least 0.33 in setback per side`, severity: 'warn', intersectionId: interId });
  }
  if (w.sillIn < 0.5) {
    ws.push({ message: `Window in dormer ${interId} sill too low: minimum 0.5 in for model scale`, severity: 'warn', intersectionId: interId });
  }
  if (w.sillIn + w.heightIn + 0.33 > h_front) {
    ws.push({ message: `Window in dormer ${interId} too tall: leaves no header above`, severity: 'warn', intersectionId: interId });
  }
  return ws;
}

function isDormerGable(i: Intersection): i is Intersection & { kind: 'dormer-gable'; placement: DormerGablePlacement } {
  return i.kind === 'dormer-gable';
}

function isDormerShed(i: Intersection): i is Intersection & { kind: 'dormer-shed'; placement: DormerShedPlacement } {
  return i.kind === 'dormer-shed';
}

function dormerWidthAndPosition(i: Intersection): { x: number; w: number; side: 'north' | 'south' } | null {
  if (isDormerGable(i)) {
    return { x: i.placement.xAlongHostRidge, w: i.placement.widthIn, side: i.placement.side };
  }
  if (isDormerShed(i)) {
    return { x: i.placement.xAlongHostRidge, w: i.placement.widthIn, side: i.placement.side };
  }
  return null;
}

function dormerYFromRidge(i: Intersection): number | null {
  if (isDormerGable(i)) return i.placement.yFromHostRidge;
  if (isDormerShed(i)) return Math.min(i.placement.yBackFromHostRidge, i.placement.yFrontFromHostRidge);
  return null;
}

export function validateBuilding(b: Building): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (const inter of b.intersections) {
    if (!isDormerGable(inter) && !isDormerShed(inter)) continue;
    const host = b.units.find((u) => u.id === inter.placement.hostId);
    if (!host) continue;

    const pos = dormerWidthAndPosition(inter)!;
    const y = dormerYFromRidge(inter);

    if (y !== null && y < MIN_RIDGE_SETBACK_IN) {
      warnings.push({
        message: `Dormer ${inter.id} too close to main ridge: leave at least ${MIN_RIDGE_SETBACK_IN} in`,
        severity: 'warn',
        intersectionId: inter.id,
      });
    }

    const distanceToEave = host.spanIn / 2 - (y ?? 0);
    if (distanceToEave < MIN_EAVE_SETBACK_IN) {
      warnings.push({
        message: `Dormer ${inter.id} too close to eave: typical 0.67-1.33 in setback`,
        severity: 'warn',
        intersectionId: inter.id,
      });
    }

    if (pos.w > host.houseLengthIn * MAX_DORMER_WIDTH_RATIO) {
      warnings.push({
        message: `Dormer ${inter.id} wider than one-third of the host; consider switching to cross-gable`,
        severity: 'info',
        intersectionId: inter.id,
      });
    }

    if (isDormerGable(inter) && inter.placement.window) {
      const p = inter.placement;
      const h_cheek = p.ridgeHeightIn - (p.widthIn / 2) * (p.pitchRise / p.pitchRun);
      warnings.push(...validateWindowOpening(inter.id, inter.placement.window, p.widthIn, h_cheek));
    }

    if (isDormerShed(inter) && inter.placement.window) {
      const p = inter.placement;
      warnings.push(...validateWindowOpening(inter.id, inter.placement.window, p.widthIn, p.frontWallHeightIn));
    }
  }

  const bySlope = new Map<string, Intersection[]>();
  for (const inter of b.intersections) {
    if (!isDormerGable(inter) && !isDormerShed(inter)) continue;
    const key = `${inter.placement.hostId}:${inter.placement.side}`;
    const arr = bySlope.get(key) ?? [];
    arr.push(inter);
    bySlope.set(key, arr);
  }

  for (const [key, dormers] of bySlope) {
    const gables = dormers.filter(isDormerGable);
    const sheds = dormers.filter(isDormerShed);
    if (gables.length > MAX_GABLE_DORMERS_PER_SLOPE) {
      warnings.push({
        message: `Maximum 3 gable dormers per slope (${key} has ${gables.length})`,
        severity: 'warn',
      });
    }
    if (sheds.length > MAX_SHED_DORMERS_PER_SLOPE) {
      warnings.push({
        message: `Maximum 2 shed dormers per slope (${key} has ${sheds.length})`,
        severity: 'warn',
      });
    }

    for (let i = 0; i < dormers.length; i++) {
      for (let j = i + 1; j < dormers.length; j++) {
        const a = dormerWidthAndPosition(dormers[i])!;
        const bb = dormerWidthAndPosition(dormers[j])!;
        const center2center = Math.abs(a.x - bb.x);
        const minSpacing = Math.max(a.w, bb.w) + (a.w + bb.w) / 2;
        if (center2center < minSpacing) {
          warnings.push({
            message: `Dormers ${dormers[i].id} and ${dormers[j].id} too close: leave at least one dormer-width between them`,
            severity: 'warn',
          });
        }
      }
    }
  }

  return warnings;
}
