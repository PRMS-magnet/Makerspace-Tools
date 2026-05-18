import { describe, it, expect } from 'vitest';
import type { Piece, Sheet, Polygon, PolygonWithHoles } from '../types';
import { pack } from './nfp-packer';
import { roofPieces } from '../../roof';
import { BUILTIN_ROOF_PRESETS } from '../../../state/presets/tool';
import { bboxLayoutOnSheet } from './bbox-fallback';

function rect(w: number, h: number): Polygon {
  return [[0, 0], [w, 0], [w, h], [0, h]];
}
function piece(w: number, h: number, label: string): Piece {
  return { polygon: rect(w, h), op: 'cut', label };
}

function pieceWithFeature(
  w: number,
  h: number,
  label: string,
  feature: Polygon,
): Piece {
  return { polygon: rect(w, h), op: 'cut', label, engravedFeatures: [feature] };
}
const sheet12: Sheet = { widthIn: 12, marginIn: 0.12, pieceSpacingIn: 0 };
const sheet12sp: Sheet = { widthIn: 12, marginIn: 0.12, pieceSpacingIn: 0.05 };

describe('nfp-packer (rotation-aware BLF, no-rotation cases)', () => {
  it('places one piece flush to the bottom-left margin', () => {
    const r = pack([piece(2, 1, 'a')], sheet12, { rotations: [0], pieceSpacingIn: 0, effort: 'realtime' });
    expect(r.placed).toHaveLength(1);
    expect(r.placed[0].offsetIn[0]).toBeCloseTo(0.12, 6);
    expect(r.placed[0].offsetIn[1]).toBeCloseTo(0.12, 6);
  });

  it('honours pieceSpacingIn between two adjacent pieces', () => {
    const r = pack(
      [piece(3, 1, 'a'), piece(3, 1, 'b')],
      sheet12sp,
      { rotations: [0], pieceSpacingIn: 0.05, effort: 'realtime' },
    );
    expect(r.placed).toHaveLength(2);
    const [aX, aY] = r.placed[0].offsetIn;
    const [bX, bY] = r.placed[1].offsetIn;

    expect(aY).toBeCloseTo(bY, 6);

    expect(bX).toBeGreaterThanOrEqual(aX + 3 + 0.05 - 1e-6);
  });

  it('warns when a piece is wider than the usable sheet at every rotation', () => {
    const r = pack([piece(15, 1, 'too-wide')], sheet12, { rotations: [0], pieceSpacingIn: 0, effort: 'realtime' });
    expect(r.placed).toHaveLength(0);
    expect(r.warnings.some((w) => w.includes('did not fit'))).toBe(true);
  });
});

describe('nfp-packer (rotation)', () => {
  it('rotates a long piece to fit on a narrow sheet', () => {

    const r = pack(
      [piece(8, 1, 'long')],
      { widthIn: 5, marginIn: 0.1 },
      { rotations: [0, 90], pieceSpacingIn: 0, effort: 'realtime' },
    );
    expect(r.placed).toHaveLength(1);

    const outline = r.placed[0].polygon as Polygon;
    const xs = outline.map((p) => p[0]);
    const ys = outline.map((p) => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(1, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(8, 6);
  });

  it('rotates engravedFeatures together with the outline when the piece is rotated', () => {
    // 1x8 piece with a feature at (0..1, 4..4.1) -- a thin horizontal tick near y=4
    // After 90deg rotation, the outline becomes 8 wide x 1 tall, and the feature
    // should rotate with it (ending up around x=3.9..4 in the rotated frame).
    const feature: Polygon = [[0, 4], [1, 4], [1, 4.1], [0, 4.1]];
    const r = pack(
      [pieceWithFeature(1, 8, 'tall-with-mark', feature)],
      sheet12,
      { rotations: [0, 90], pieceSpacingIn: 0, effort: 'realtime' },
    );
    expect(r.placed).toHaveLength(1);
    const placed = r.placed[0];
    expect(placed.engravedFeatures).toBeDefined();
    const featPts = placed.engravedFeatures![0] as readonly (readonly [number, number])[];
    const outline = placed.polygon as Polygon;
    const outBb = {
      minX: Math.min(...outline.map((p) => p[0])),
      maxX: Math.max(...outline.map((p) => p[0])),
      minY: Math.min(...outline.map((p) => p[1])),
      maxY: Math.max(...outline.map((p) => p[1])),
    };
    const featBb = {
      minX: Math.min(...featPts.map((p) => p[0])),
      maxX: Math.max(...featPts.map((p) => p[0])),
      minY: Math.min(...featPts.map((p) => p[1])),
      maxY: Math.max(...featPts.map((p) => p[1])),
    };
    // Feature must sit inside the outline's bbox after rotation+translation.
    expect(featBb.minX).toBeGreaterThanOrEqual(outBb.minX - 1e-6);
    expect(featBb.maxX).toBeLessThanOrEqual(outBb.maxX + 1e-6);
    expect(featBb.minY).toBeGreaterThanOrEqual(outBb.minY - 1e-6);
    expect(featBb.maxY).toBeLessThanOrEqual(outBb.maxY + 1e-6);
  });
});

describe('nfp-packer (PolygonWithHoles)', () => {
  it('keeps inner holes attached to the outline as a single placement', () => {
    const pwh: PolygonWithHoles = {
      outline: rect(3, 1),
      holes: [rect(1, 1)],
    };
    const r = pack(
      [{ polygon: pwh, op: 'cut', label: 'ridge' }],
      sheet12,
      { rotations: [0], pieceSpacingIn: 0, effort: 'realtime' },
    );
    expect(r.placed).toHaveLength(1);
    expect(r.placed[0].label).toBe('ridge');
    const placed = r.placed[0].polygon;
    if (!('outline' in placed) || !('holes' in placed)) {
      throw new Error('expected PolygonWithHoles after packing');
    }
    expect(placed.holes).toHaveLength(1);

    const hxs = placed.holes[0].map((p) => p[0]);
    const hys = placed.holes[0].map((p) => p[1]);
    expect(Math.max(...hxs) - Math.min(...hxs)).toBeCloseTo(1, 6);
    expect(Math.max(...hys) - Math.min(...hys)).toBeCloseTo(1, 6);
  });
});

describe('nfp-packer vs bbox baseline on real roof cutlist', () => {
  it('packs the default 1:18 gable preset with non-trivial density', () => {
    const params = BUILTIN_ROOF_PRESETS[0].params;
    const r = roofPieces(params);
    const result = pack(r.pieces, r.sheet, {
      rotations: [0, 90, 180, 270],
      pieceSpacingIn: r.sheet.pieceSpacingIn ?? 0,
      effort: 'high',
    });

    expect(result.placed.length).toBeGreaterThan(0);
    expect(result.density).toBeGreaterThan(0.10);
  });

  it('produces a height <= bbox baseline on the default preset', () => {
    const params = BUILTIN_ROOF_PRESETS[0].params;
    const r = roofPieces(params);
    const baseline = bboxLayoutOnSheet(r.pieces, r.sheet);
    const result = pack(r.pieces, r.sheet, {
      rotations: [0, 90, 180, 270],
      pieceSpacingIn: r.sheet.pieceSpacingIn ?? 0,
      effort: 'high',
    });
    expect(result.totalHeightIn).toBeLessThanOrEqual(baseline.totalHeightIn + 1e-6);
  });
});
