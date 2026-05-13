import { describe, it, expect } from 'vitest';
import type { RoofParams } from './types';
import { computeRoofGeometry } from './compute';
import { rafterFlat, rafterInstalled, joistInstalled, collarTieInstalled } from './polygons';
import { bbox } from '../core/polygon';

const DEFAULTS: RoofParams = {
  spanIn: 8.75, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 10.0, rafterSpacingIn: 0.875, topPlateHeightIn: 0.25,
  nPairsOverride: 2, sheetWidthIn: 12.0, maxPieceLengthIn: 12.0, marginIn: 0.12,
};
const G = computeRoofGeometry(DEFAULTS);

describe('rafterFlat', () => {
  const p = rafterFlat(G, DEFAULTS);

  it('has 13 vertices (matches installed rafter with tabs)', () => {
    expect(p.length).toBe(13);
  });

  it('all vertices have x >= 0 and y >= 0 (after shift)', () => {
    for (const [x, y] of p) {
      expect(x).toBeGreaterThanOrEqual(-1e-9);
      expect(y).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('bbox minX === 0 and minY === 0', () => {
    const b = bbox(p);
    expect(b.minX).toBeCloseTo(0, 9);
    expect(b.minY).toBeCloseTo(0, 9);
  });
});

describe('rafterInstalled', () => {
  const p = rafterInstalled(G, DEFAULTS, false);

  it('has 13 vertices', () => {
    expect(p.length).toBe(13);
  });

  it('includes the throat point (wallThickness, 0)', () => {
    const throat = p.find(([x, y]) => Math.abs(x - DEFAULTS.wallThicknessIn) < 1e-9 && Math.abs(y) < 1e-9);
    expect(throat).toBeDefined();
  });

  it('mirror=true flips x around halfSpan', () => {
    const left = rafterInstalled(G, DEFAULTS, false);
    const right = rafterInstalled(G, DEFAULTS, true);
    expect(left.length).toBe(right.length);
    for (let i = 0; i < left.length; i++) {
      expect(right[i][0]).toBeCloseTo(2 * G.halfSpan - left[i][0], 9);
      expect(right[i][1]).toBeCloseTo(left[i][1], 9);
    }
  });
});

describe('rafterInstalled — tabs', () => {
  const TENON_OPTS = {
    tabLengthIn: 0.0625,
    tabHeightIn: 0.2003,
  };
  const p = rafterInstalled(G, DEFAULTS, false, TENON_OPTS);

  it('has 13 vertices', () => {
    expect(p.length).toBe(13);
  });

  it('four vertices protrude past R (tab tip corners)', () => {
    const beyondR = p.filter(([x]) => x > G.R + 1e-9);
    expect(beyondR.length).toBe(4);
  });

  it('tab tips reach R + tabLengthIn exactly', () => {
    const expectedX = G.R + TENON_OPTS.tabLengthIn;
    const matched = p.filter(([x]) => Math.abs(x - expectedX) < 1e-9);
    expect(matched.length).toBe(4);
  });

  it('top tab spans the top tabHeight of the plumb cut', () => {
    const yTop = G.tanT * (G.R - DEFAULTS.wallThicknessIn) + DEFAULTS.rafterDepthIn / G.cosT;
    const topTabYs = p
      .filter(([x, y]) => Math.abs(x - (G.R + TENON_OPTS.tabLengthIn)) < 1e-9 && y > yTop - TENON_OPTS.tabHeightIn - 1e-9)
      .map(([, y]) => y);
    expect(topTabYs.length).toBe(2);
    expect(Math.max(...topTabYs)).toBeCloseTo(yTop, 9);
    expect(Math.min(...topTabYs)).toBeCloseTo(yTop - TENON_OPTS.tabHeightIn, 9);
  });
});

describe('joistInstalled', () => {
  const p = joistInstalled(G, DEFAULTS, 0.5);

  it('has 4 vertices (trapezoid)', () => {
    expect(p.length).toBe(4);
  });

  it('bottom edge spans (wallThickness, 0) to (span - wallThickness, 0)', () => {
    expect(p[0]).toEqual([DEFAULTS.wallThicknessIn, 0]);
    expect(p[1]).toEqual([DEFAULTS.spanIn - DEFAULTS.wallThicknessIn, 0]);
  });

  it('top edge is shorter (slanted ends following rafter slope)', () => {
    const bottomLen = p[1][0] - p[0][0];
    const topLen = p[2][0] - p[3][0];
    expect(topLen).toBeLessThan(bottomLen);
  });
});

describe('collarTieInstalled', () => {
  const p = collarTieInstalled(G, DEFAULTS, 0.3, 1 / 3);

  it('has 4 vertices', () => {
    expect(p.length).toBe(4);
  });

  it('sits in the upper portion of the rafter', () => {
    const minY = Math.min(...p.map(([_, y]) => y));
    expect(minY).toBeGreaterThan(0);
  });

  it('top edge is shorter than bottom edge', () => {
    const bottomLen = p[1][0] - p[0][0];
    const topLen = p[2][0] - p[3][0];
    expect(topLen).toBeLessThan(bottomLen);
  });
});
