import { describe, it, expect } from 'vitest';
import { computeDormerShed, computeDormerShedGeom } from './dormer-shed';
import type { RoofUnit } from '../../roof/types';
import type { DormerShedPlacement } from '../types';

const HOST: RoofUnit = {
  id: 'main',
  spanIn: 12, pitchRise: 8, pitchRun: 12,
  rafterDepthIn: 0.5, wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 24, rafterSpacingIn: 0.875,
  topPlateHeightIn: 0.25, nPairsOverride: null,
};

const PLACEMENT: DormerShedPlacement = {
  hostId: 'main', xAlongHostRidge: 12,
  yBackFromHostRidge: 1, yFrontFromHostRidge: 4,
  widthIn: 3, frontWallHeightIn: 1.5,
  pitchRise: 2, pitchRun: 12, side: 'north',
};

const OPTS = { stockThicknessIn: 0.125, kerfPerSideIn: 0.006, fitMode: 'press' as const };

describe('computeDormerShed', () => {
  const result = computeDormerShed(HOST, PLACEMENT, 'd1', OPTS);

  it('emits two cheek walls (east and west)', () => {
    const cheeks = result.newPieces.filter((p) => p.placement?.kind === 'dormer-cheek-wall');
    expect(cheeks.length).toBe(2);
  });

  it('cheek wall is a trapezoid with 4 vertices', () => {
    const cheek = result.newPieces.find((p) => p.placement?.kind === 'dormer-cheek-wall')!;
    const outline = Array.isArray(cheek.polygon) ? cheek.polygon : cheek.polygon.outline;
    expect(outline.length).toBe(4);
  });

  it('emits one rectangular front wall', () => {
    const fronts = result.newPieces.filter((p) => p.placement?.kind === 'dormer-front-wall');
    expect(fronts.length).toBe(1);
    const front = fronts[0];
    const outline = Array.isArray(front.polygon) ? front.polygon : front.polygon.outline;
    expect(outline.length).toBe(4);
  });

  it('emits one inboard header', () => {
    const headers = result.newPieces.filter((p) => p.placement?.kind === 'shed-dormer-header');
    expect(headers.length).toBe(1);
  });

  it('emits cripple rafters', () => {
    const cripples = result.newPieces.filter((p) => p.placement?.kind === 'shed-dormer-cripple');
    expect(cripples.length).toBeGreaterThan(0);
  });

  it('emits dormer common rafters', () => {
    const rafters = result.newPieces.filter((p) => p.placement?.kind === 'dormer-rafter');
    expect(rafters.length).toBeGreaterThan(0);
  });
});

describe('computeDormerShed -- window opening', () => {
  it('front wall is PolygonWithHoles when window is set', () => {
    const r = computeDormerShed(HOST, { ...PLACEMENT, window: { widthIn: 1.5, heightIn: 0.8, sillIn: 0.3 } }, 'd1', OPTS);
    const front = r.newPieces.find((p) => p.placement?.kind === 'dormer-front-wall')!;
    expect(Array.isArray(front.polygon)).toBe(false);
    if (!Array.isArray(front.polygon)) {
      expect(front.polygon.outline.length).toBe(4);
      expect(front.polygon.holes.length).toBe(1);
      expect(front.polygon.holes[0].length).toBe(4);
    }
  });
});

describe('computeDormerShedGeom', () => {
  const g = computeDormerShedGeom(HOST, PLACEMENT);

  it('matches the math-doc worked example', () => {
    expect(g.y_back).toBeCloseTo(5, 6);
    expect(g.y_front).toBeCloseTo(2, 6);
    expect(g.L_along).toBeCloseTo(3, 6);
    expect(g.Z_front_plate).toBeCloseTo((6 - 2) * (8 / 12) + 1.5, 6);
    expect(g.Z_header).toBeCloseTo(g.Z_front_plate + 3 * (2 / 12), 6);
  });
});
