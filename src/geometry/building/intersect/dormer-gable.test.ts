import { describe, it, expect } from 'vitest';
import { computeDormerGable } from './dormer-gable';
import type { RoofUnit } from '../../roof/types';
import type { DormerGablePlacement } from '../types';

const HOST: RoofUnit = {
  id: 'main',
  spanIn: 12, pitchRise: 8, pitchRun: 12,
  rafterDepthIn: 0.5, wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 24, rafterSpacingIn: 0.875,
  topPlateHeightIn: 0.25, nPairsOverride: null,
};

const PLACEMENT: DormerGablePlacement = {
  hostId: 'main', xAlongHostRidge: 12, yFromHostRidge: 2,
  widthIn: 3, ridgeHeightIn: 2.5,
  pitchRise: 8, pitchRun: 12, side: 'north',
};

const OPTS = { stockThicknessIn: 0.125, kerfPerSideIn: 0.006, fitMode: 'press' as const };

describe('computeDormerGable', () => {
  const result = computeDormerGable(HOST, PLACEMENT, 'd1', OPTS);

  it('emits two cheek walls (east and west)', () => {
    const cheeks = result.newPieces.filter((p) => p.placement?.kind === 'dormer-cheek-wall');
    expect(cheeks.length).toBe(2);
    const sides = new Set(cheeks.map((p) => (p.placement as { side: string }).side));
    expect(sides).toEqual(new Set(['east', 'west']));
  });

  it('emits one front wall', () => {
    const fronts = result.newPieces.filter((p) => p.placement?.kind === 'dormer-front-wall');
    expect(fronts.length).toBe(1);
  });

  it('front wall pentagon has 5 vertices', () => {
    const front = result.newPieces.find((p) => p.placement?.kind === 'dormer-front-wall')!;
    const outline = Array.isArray(front.polygon) ? front.polygon : front.polygon.outline;
    expect(outline.length).toBe(5);
  });

  it('emits one dormer ridge', () => {
    const ridges = result.newPieces.filter((p) => p.placement?.kind === 'dormer-ridge');
    expect(ridges.length).toBe(1);
  });

  it('emits two California valley boards', () => {
    const valleys = result.newPieces.filter((p) => p.placement?.kind === 'dormer-cali-valley');
    expect(valleys.length).toBe(2);
  });

  it('emits two rafter plates', () => {
    const plates = result.newPieces.filter((p) => p.placement?.kind === 'dormer-rafter-plate');
    expect(plates.length).toBe(2);
  });

  it('valley jack count is non-zero for this placement', () => {
    const jacks = result.newPieces.filter((p) => p.placement?.kind === 'dormer-valley-jack');
    expect(jacks.length).toBeGreaterThan(0);
  });
});
