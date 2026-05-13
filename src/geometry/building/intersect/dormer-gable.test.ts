import { describe, it, expect } from 'vitest';
import { computeDormerGable, computeDormerGableGeom } from './dormer-gable';
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
  widthIn: 2, ridgeHeightIn: 1,
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

describe('computeDormerGable -- window opening', () => {
  it('front wall is PolygonWithHoles when window is set', () => {
    const r = computeDormerGable(HOST, { ...PLACEMENT, window: { widthIn: 1.5, heightIn: 1.5, sillIn: 0.3 } }, 'd1', OPTS);
    const front = r.newPieces.find((p) => p.placement?.kind === 'dormer-front-wall')!;
    expect(Array.isArray(front.polygon)).toBe(false);
    if (!Array.isArray(front.polygon)) {
      expect(front.polygon.outline.length).toBe(5);
      expect(front.polygon.holes.length).toBe(1);
      expect(front.polygon.holes[0].length).toBe(4);
    }
  });

  it('front wall is plain Polygon when no window is set', () => {
    const front = computeDormerGable(HOST, PLACEMENT, 'd1', OPTS)
      .newPieces.find((p) => p.placement?.kind === 'dormer-front-wall')!;
    expect(Array.isArray(front.polygon)).toBe(true);
  });
});

describe('computeDormerGableGeom', () => {
  const g = computeDormerGableGeom(HOST, PLACEMENT);

  it('matches the math-doc worked example (north side, valid geometry)', () => {
    expect(g.sideSign).toBe(1);
    expect(g.d_front).toBeCloseTo(2, 6);
    expect(g.y_front).toBeCloseTo(2, 6);
    expect(g.z_main_front).toBeCloseTo(8 / 3, 6);
    expect(g.Z_dormer_ridge).toBeCloseTo(8 / 3 + 1, 6);
    expect(g.Z_cheek).toBeCloseTo(8 / 3 + 1 - (2 / 3), 6);
    expect(g.d_back).toBeCloseTo(0.5, 6);
    expect(g.d_valley_at_cheek).toBeCloseTo(1.5, 6);
    expect(g.y_back).toBeCloseTo(0.5, 6);
    expect(g.y_valley_at_cheek).toBeCloseTo(1.5, 6);
    expect(g.L_dormer_ridge).toBeCloseTo(1.5, 6);
    expect(g.L_cheek_horizontal).toBeCloseTo(0.5, 6);
    expect(g.fits).toBe(true);
  });

  it('flips world-Y signs when side is south', () => {
    const south = computeDormerGableGeom(HOST, { ...PLACEMENT, side: 'south' });
    expect(south.sideSign).toBe(-1);
    expect(south.y_front).toBeCloseTo(-2, 6);
    expect(south.y_back).toBeCloseTo(-0.5, 6);
    expect(south.y_valley_at_cheek).toBeCloseTo(-1.5, 6);
    expect(south.d_front).toBeCloseTo(2, 6);
  });

  it('reports fits=false when dormer ridge would exceed main ridge', () => {
    const tall = computeDormerGableGeom(HOST, { ...PLACEMENT, ridgeHeightIn: 5 });
    expect(tall.fits).toBe(false);
  });
});
