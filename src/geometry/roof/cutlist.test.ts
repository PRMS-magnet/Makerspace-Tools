import { describe, it, expect } from 'vitest';
import type { RoofParams } from './types';
import { isPolygonWithHoles } from '../core/types';
import { computeRoofGeometry } from './compute';
import { buildCutListPieces, computeRoofCounts } from './cutlist';

const DEFAULTS: RoofParams = {
  spanIn: 8.75, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 10.0, rafterSpacingIn: 0.875, topPlateHeightIn: 0.25,
  nPairsOverride: 2, sheetWidthIn: 12.0, maxPieceLengthIn: 12.0, marginIn: 0.12,
};

const OPTS = {
  stockThicknessIn: 0.125,
  kerfPerSideIn: 0.006,
  fitMode: 'press' as const,
  ridgeEndMarginIn: 0,
  ridgeFaceMarginIn: 0.125,
};

describe('computeRoofCounts', () => {
  it('uses nPairsOverride when set', () => {
    const c = computeRoofCounts(DEFAULTS);
    expect(c.nPairs).toBe(2);
    expect(c.nRafters).toBe(4);
    expect(c.effectiveHouseLengthIn).toBe(0.875);
  });

  it('derives nPairs from houseLength / rafterSpacing when override is null', () => {
    const c = computeRoofCounts({ ...DEFAULTS, nPairsOverride: null });
    expect(c.nPairs).toBe(Math.max(2, Math.round(10 / 0.875) + 1));
    expect(c.nRafters).toBe(c.nPairs * 2);
    expect(c.effectiveHouseLengthIn).toBe(10);
  });

  it('ridge splits when effective length exceeds max piece length', () => {
    const c = computeRoofCounts({ ...DEFAULTS, nPairsOverride: null, houseLengthIn: 30, maxPieceLengthIn: 12 });
    expect(c.nRidgePieces).toBeGreaterThan(1);
  });

  it('one ridge piece for short effective length', () => {
    const c = computeRoofCounts(DEFAULTS);
    expect(c.nRidgePieces).toBe(1);
  });
});

describe('buildCutListPieces', () => {
  const G = computeRoofGeometry(DEFAULTS);
  const counts = computeRoofCounts(DEFAULTS);
  const { pieces, warnings } = buildCutListPieces(DEFAULTS, G, counts, OPTS);

  it('includes rafters, ridge pieces, joists, collar ties, and top plates', () => {
    const labels = pieces.map((p) => p.label);
    expect(labels.filter((l) => l === 'rafter')).toHaveLength(counts.nRafters);
    expect(labels.filter((l) => l === 'ridge')).toHaveLength(counts.nRidgePieces);
    expect(labels.filter((l) => l === 'joist')).toHaveLength(counts.nPairs);
    expect(labels.filter((l) => l === 'collar tie')).toHaveLength(counts.nPairs);
    expect(labels.filter((l) => l === 'top plate')).toHaveLength(counts.nPairs);
  });

  it('every piece has op="cut"', () => {
    for (const p of pieces) expect(p.op).toBe('cut');
  });

  it('no warnings for default params', () => {
    expect(warnings).toEqual([]);
  });

  it('ridge piece is a PolygonWithHoles', () => {
    const ridges = pieces.filter((p) => p.label === 'ridge');
    expect(ridges.length).toBe(counts.nRidgePieces);
    for (const r of ridges) {
      expect(isPolygonWithHoles(r.polygon)).toBe(true);
    }
  });

  it('boundary mortises (at left/right edges) are integrated into the outline', () => {
    const ridges = pieces.filter((p) => p.label === 'ridge');
    const firstRidge = ridges[0];
    if (!isPolygonWithHoles(firstRidge.polygon)) throw new Error('expected with holes');


    expect(firstRidge.polygon.holes.length).toBe(0);

    expect(firstRidge.polygon.outline.length).toBe(4 + 4 * 2 * counts.nPairs);
  });

  it('no hole edge coincides with the outline edge', () => {
    const ridges = pieces.filter((p) => p.label === 'ridge');
    for (const r of ridges) {
      if (!isPolygonWithHoles(r.polygon)) throw new Error('expected with holes');
      const outlineXs = r.polygon.outline.map(([x]) => x);
      const outlineYs = r.polygon.outline.map(([, y]) => y);
      const xMin = Math.min(...outlineXs);
      const xMax = Math.max(...outlineXs);
      const yMin = Math.min(...outlineYs);
      const yMax = Math.max(...outlineYs);
      for (const hole of r.polygon.holes) {
        const hxs = hole.map(([x]) => x);
        const hys = hole.map(([, y]) => y);
        expect(Math.min(...hxs)).toBeGreaterThan(xMin + 1e-9);
        expect(Math.max(...hxs)).toBeLessThan(xMax - 1e-9);
        expect(Math.min(...hys)).toBeGreaterThan(yMin + 1e-9);
        expect(Math.max(...hys)).toBeLessThan(yMax - 1e-9);
      }
    }
  });

  it('ridge length covers the full rafter-slab span (flush ends)', () => {
    const ridges = pieces.filter((p) => p.label === 'ridge');
    const totalRidgeLength = ridges.reduce((n, r) => {
      const outline = isPolygonWithHoles(r.polygon) ? r.polygon.outline : r.polygon;
      const xs = outline.map(([x]) => x);
      return n + (Math.max(...xs) - Math.min(...xs));
    }, 0);
    const expected = (counts.nPairs - 1) * DEFAULTS.rafterSpacingIn + OPTS.stockThicknessIn;
    expect(totalRidgeLength).toBeCloseTo(expected, 6);
  });
});

describe('buildCutListPieces — configurable ridge margins', () => {
  const G = computeRoofGeometry(DEFAULTS);
  it('ridgeEndMarginIn extends the ridge length and closes end-mortise notches', () => {
    const counts = computeRoofCounts(DEFAULTS, OPTS.stockThicknessIn, 0.25);
    const { pieces } = buildCutListPieces(DEFAULTS, G, counts, { ...OPTS, ridgeEndMarginIn: 0.25 });
    const ridges = pieces.filter((p) => p.label === 'ridge');
    const r = ridges[0];
    if (!isPolygonWithHoles(r.polygon)) throw new Error('expected with holes');
    expect(r.polygon.holes.length).toBe(2 * counts.nPairs);
    const xs = r.polygon.outline.map(([x]) => x);
    const lengthOut = Math.max(...xs) - Math.min(...xs);
    expect(lengthOut).toBeCloseTo((counts.nPairs - 1) * DEFAULTS.rafterSpacingIn + OPTS.stockThicknessIn + 0.5, 6);
  });

  it('ridgeFaceMarginIn = 0 produces top/bottom edge notches instead of closed mortises', () => {
    const counts = computeRoofCounts(DEFAULTS, OPTS.stockThicknessIn, 0.25);
    const { pieces } = buildCutListPieces(DEFAULTS, G, counts, {
      ...OPTS,
      ridgeEndMarginIn: 0.25,
      ridgeFaceMarginIn: 0,
    });
    const ridges = pieces.filter((p) => p.label === 'ridge');
    const r = ridges[0];
    if (!isPolygonWithHoles(r.polygon)) throw new Error('expected with holes');
    expect(r.polygon.holes.length).toBe(0);
    const ys = r.polygon.outline.map(([, y]) => y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(G.plumbCutLength, 6);
  });

  it('both margins = 0 cuts corner notches at the end-rafter mortises (no error)', () => {
    const counts = computeRoofCounts(DEFAULTS, OPTS.stockThicknessIn, 0);
    const { pieces } = buildCutListPieces(DEFAULTS, G, counts, {
      ...OPTS,
      ridgeEndMarginIn: 0,
      ridgeFaceMarginIn: 0,
    });
    const ridges = pieces.filter((p) => p.label === 'ridge');
    const r = ridges[0];
    if (!isPolygonWithHoles(r.polygon)) throw new Error('expected with holes');
    expect(r.polygon.holes.length).toBe(0);
    const xs = r.polygon.outline.map(([x]) => x);
    const ys = r.polygon.outline.map(([, y]) => y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(
      (counts.nPairs - 1) * DEFAULTS.rafterSpacingIn + OPTS.stockThicknessIn,
      6,
    );
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(G.plumbCutLength, 6);


    expect(r.polygon.outline.length).toBe(12);
  });
});
