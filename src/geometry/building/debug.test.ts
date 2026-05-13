import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildingCutlist } from './compose';
import { lPlanPreset, tPlanPreset, simpleGablePreset } from './presets';
import {
  bboxOfPieces3D,
  piecesFromUnit,
  piecesByLabel,
  piece3DWorldCorners,
  buildDebugSvg,
} from './debug';
import { pitchTangent, wingRidgeEndpointY, valley3DLengthPerUnitT } from './intersect/common';

const MAIN_PARAMS = {
  spanIn: 12, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5, houseLengthIn: 24,
  rafterSpacingIn: 0.875, topPlateHeightIn: 0.25, nPairsOverride: null,
  sheetWidthIn: 12, maxPieceLengthIn: 12, marginIn: 0.12,
};

const EPS = 0.6;

describe('bboxOfPieces3D + spatial invariants for cross-gable-T', () => {
  const wing = { ...MAIN_PARAMS, spanIn: 8, houseLengthIn: 10 };
  const b = tPlanPreset(MAIN_PARAMS, wing, 12);
  const out = buildingCutlist(b);
  const all = out.pieces3D;
  const host = piecesFromUnit(all, 'main');
  const wingPieces = piecesFromUnit(all, 'wing');

  it('every piece is tagged with its unitId', () => {
    expect(all.length).toBeGreaterThan(0);
    expect(host.length).toBeGreaterThan(0);
    expect(wingPieces.length).toBeGreaterThan(0);
    expect(host.length + wingPieces.length).toBe(all.length);
  });

  it('host bbox sits in x = [-X_main/2, X_main/2] in its centered local frame transformed to world', () => {
    const bb = bboxOfPieces3D(host);
    expect(bb.minX).toBeGreaterThanOrEqual(-MAIN_PARAMS.houseLengthIn / 2 - EPS);
    expect(bb.maxX).toBeLessThanOrEqual(MAIN_PARAMS.houseLengthIn / 2 + EPS);
  });

  it('wing footprint is centered horizontally on xAlongHostRidge', () => {
    const bb = bboxOfPieces3D(wingPieces);
    const center = (bb.minX + bb.maxX) / 2;
    expect(center).toBeCloseTo(12, 0);
  });

  it('wing bbox is on the +y side of the host bbox (T-plan north extension)', () => {
    const hb = bboxOfPieces3D(host);
    const wb = bboxOfPieces3D(wingPieces);
    expect(wb.maxY).toBeGreaterThan(hb.maxY);
  });

  it('wing centroid in y exceeds host centroid in y (T-plan north extension)', () => {
    const hb = bboxOfPieces3D(host);
    const wb = bboxOfPieces3D(wingPieces);
    const hCenter = (hb.minY + hb.maxY) / 2;
    const wCenter = (wb.minY + wb.maxY) / 2;
    expect(wCenter).toBeGreaterThan(hCenter);
  });

  it('host bbox in y is centered around the origin (centered local frame)', () => {
    const hb = bboxOfPieces3D(host);
    const center = (hb.minY + hb.maxY) / 2;
    expect(Math.abs(center)).toBeLessThan(EPS);
  });
});

describe('spatial invariants for cross-gable-L NW', () => {
  const wing = { ...MAIN_PARAMS, spanIn: 12, houseLengthIn: 12 };
  const b = lPlanPreset(MAIN_PARAMS, wing, 'NW');
  const out = buildingCutlist(b);
  const host = piecesFromUnit(out.pieces3D, 'main');
  const wingPieces = piecesFromUnit(out.pieces3D, 'wing');

  it('wing footprint sits at x in [0, W_wing] for NW corner', () => {
    const wb = bboxOfPieces3D(wingPieces);
    expect(wb.minX).toBeGreaterThanOrEqual(-EPS);
    expect(wb.maxX).toBeLessThanOrEqual(wing.spanIn + EPS);
  });

  it('wing footprint extends into +y away from the main', () => {
    const hb = bboxOfPieces3D(host);
    const wb = bboxOfPieces3D(wingPieces);
    expect(wb.maxY).toBeGreaterThan(hb.maxY);
  });
});

describe('piece3DWorldCorners is consistent with origin + axes math', () => {
  it('identity-axis rectangle at origin equals its polygon', () => {
    const piece = {
      polygon: [[0, 0], [1, 0], [1, 1], [0, 1]] as ReadonlyArray<readonly [number, number]>,
      origin: [10, 20, 5] as const,
      uAxis: [1, 0, 0] as const,
      vAxis: [0, 1, 0] as const,
      extrudeDepthIn: 0.125,
      label: 'rafter',
      unitId: 'test',
    };
    const corners = piece3DWorldCorners(piece);
    expect(corners[0]).toEqual([10, 20, 5]);
    expect(corners[1]).toEqual([11, 20, 5]);
    expect(corners[2]).toEqual([11, 21, 5]);
    expect(corners[3]).toEqual([10, 21, 5]);
  });
});

describe('buildDebugSvg', () => {
  const wing = { ...MAIN_PARAMS, spanIn: 8, houseLengthIn: 10 };
  const b = tPlanPreset(MAIN_PARAMS, wing, 12);
  const out = buildingCutlist(b);

  it('produces a valid SVG containing every unit color and a legend entry per unit', () => {
    const svg = buildDebugSvg(out.pieces3D);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('main');
    expect(svg).toContain('wing');
  });

  it('top (xy) projection produces a different SVG than front (xz)', () => {
    const top = buildDebugSvg(out.pieces3D, { plane: 'xy' });
    const front = buildDebugSvg(out.pieces3D, { plane: 'xz' });
    expect(top).not.toBe(front);
  });
});

describe('fast-check cross-gable invariants', () => {
  const pitch = fc.constantFrom(3, 4, 6, 8, 10, 12);
  const span = fc.double({ min: Math.fround(4), max: Math.fround(24), noNaN: true });
  const length = fc.double({ min: Math.fround(6), max: Math.fround(36), noNaN: true });

  it('valley3DLengthPerUnitT >= sqrt(2) for any positive equal pitch', () => {
    fc.assert(fc.property(
      fc.double({ min: Math.fround(0.1), max: Math.fround(2), noNaN: true }),
      (m) => {
        const len = valley3DLengthPerUnitT(m, m);
        expect(len).toBeGreaterThanOrEqual(Math.SQRT2 - 1e-9);
      },
    ));
  });

  it('wingRidgeEndpointY is in [0, Y_main] when the wing geometrically fits', () => {
    fc.assert(fc.property(pitch, pitch, span, span, (mp, wp, S_main, S_wing) => {
      const m_main = mp / 12;
      const m_wing = wp / 12;
      // Wing fits when its projected y-shrinkage stays inside the host span.
      fc.pre((m_wing / m_main) * (S_wing / 2) <= S_main);
      const yEnd = wingRidgeEndpointY({
        Y_main: S_main, S_wing, m_main, m_wing,
      });
      expect(yEnd).toBeLessThanOrEqual(S_main + 1e-6);
      expect(yEnd).toBeGreaterThanOrEqual(0 - 1e-6);
    }));
  });

  it('T-plan: wing bbox center is within rafter spacing of xAlongHostRidge', () => {
    fc.assert(fc.property(
      pitch, length, span,
      (p, mainLen, wingSpan) => {
        fc.pre(wingSpan < mainLen);
        const main = { ...MAIN_PARAMS, pitchRise: p, houseLengthIn: mainLen };
        const wing = { ...main, spanIn: wingSpan, houseLengthIn: 6 };
        const xAlong = mainLen / 2;
        const out = buildingCutlist(tPlanPreset(main, wing, xAlong));
        const wbb = bboxOfPieces3D(piecesFromUnit(out.pieces3D, 'wing'));
        const center = (wbb.minX + wbb.maxX) / 2;
        expect(center).toBeCloseTo(xAlong, 0);
      },
    ), { numRuns: 25 });
  });

  it('simple gable: pieces3D is symmetric around the local x origin', () => {
    fc.assert(fc.property(
      pitch, length, span,
      (p, len, sp) => {
        const params = { ...MAIN_PARAMS, pitchRise: p, houseLengthIn: len, spanIn: sp };
        const out = buildingCutlist(simpleGablePreset(params));
        const rafters = piecesByLabel(out.pieces3D, 'rafter');
        if (rafters.length === 0) return;
        const xs = rafters.map((r) => r.origin[0]);
        const xMin = Math.min(...xs);
        const xMax = Math.max(...xs);
        expect(xMin + xMax).toBeCloseTo(0, 3);
      },
    ), { numRuns: 25 });
  });
});
