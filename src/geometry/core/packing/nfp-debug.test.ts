import { describe, it, expect } from 'vitest';
import type { Piece, Sheet } from '../types';
import { pack } from './nfp-packer';
import { nfpConvex, pointStrictlyInside, translate, ensureCCW, convexHull } from './geom';

describe('debug: identical joist-shape pieces should not stack', () => {
  it('two identical 8x0.5 rectangles must not occupy the same spot', () => {
    const r: [number, number][] = [[0, 0], [8, 0], [8, 0.5], [0, 0.5]];
    const pieces: Piece[] = [
      { polygon: r, op: 'cut', label: 'a' },
      { polygon: r, op: 'cut', label: 'b' },
    ];
    const sheet: Sheet = { widthIn: 12, marginIn: 0.15, pieceSpacingIn: 0 };
    const result = pack(pieces, sheet, { rotations: [0, 90, 180, 270], pieceSpacingIn: 0, effort: 'high' });
    expect(result.placed).toHaveLength(2);
    const [p0, p1] = result.placed;
    const distinct = Math.abs(p0.offsetIn[0] - p1.offsetIn[0]) > 1e-6 || Math.abs(p0.offsetIn[1] - p1.offsetIn[1]) > 1e-6;
    if (!distinct) {
      console.log('STACKED:', p0.offsetIn, p1.offsetIn);
    }
    expect(distinct).toBe(true);
  });

  it('NFP of two identical 8x0.5 rectangles: (0.15, 0.15) should be strictly inside the translated NFP when A is at (0.15, 0.15)', () => {
    const A: [number, number][] = [[0, 0], [8, 0], [8, 0.5], [0, 0.5]];

    const Atrans = ensureCCW(convexHull(translate(A, [0.15, 0.15])));
    const B = ensureCCW(convexHull(A));
    const nfp = nfpConvex(Atrans, B);
    console.log('NFP vertices:', JSON.stringify(nfp));

    const isInside = pointStrictlyInside([0.15, 0.15], nfp);
    expect(isInside).toBe(true);
  });

  it('replicate packer flow: prepare both, place first at (0.15, 0.15), then check NFP for second at same point', () => {
    const r: [number, number][] = [[0, 0], [8, 0], [8, 0.5], [0, 0.5]];

    const hull = ensureCCW(convexHull(r));

    let lo = 0;
    for (let i = 1; i < hull.length; i++) {
      if (hull[i][1] < hull[lo][1] - 1e-9 || (Math.abs(hull[i][1] - hull[lo][1]) < 1e-9 && hull[i][0] < hull[lo][0])) lo = i;
    }
    const reordered: [number, number][] = [...hull.slice(lo), ...hull.slice(0, lo)] as [number, number][];
    const refOffset: [number, number] = reordered[0];

    const refPos: [number, number] = [0.15, 0.15];
    const placedHull = translate(reordered, [refPos[0] - refOffset[0], refPos[1] - refOffset[1]]);
    console.log('placedHull:', JSON.stringify(placedHull));
    console.log('refOffset:', refOffset);

    const nfp = nfpConvex(placedHull, reordered);
    console.log('NFP:', JSON.stringify(nfp));
    const isInside = pointStrictlyInside([0.15, 0.15], nfp);
    console.log('pointStrictlyInside(0.15, 0.15):', isInside);
    expect(isInside).toBe(true);
  });

  it('mirrors the packer: pack 1 piece, then NFP-vs-second-piece should reject (0.15, 0.15)', () => {
    const r: [number, number][] = [[0, 0], [8, 0], [8, 0.5], [0, 0.5]];
    const sheet: Sheet = { widthIn: 12, marginIn: 0.15, pieceSpacingIn: 0 };

    const result = pack([{ polygon: r, op: 'cut', label: 'a' }, { polygon: r, op: 'cut', label: 'b' }], sheet, {
      rotations: [0], pieceSpacingIn: 0, effort: 'realtime',
    });
    console.log('placements:', result.placed.map(p => ({ label: p.label, offsetIn: p.offsetIn })));
    expect(result.placed.length).toBe(2);
    const p0 = result.placed[0].offsetIn, p1 = result.placed[1].offsetIn;
    const distinct = Math.abs(p0[0] - p1[0]) > 1e-4 || Math.abs(p0[1] - p1[1]) > 1e-4;
    expect(distinct).toBe(true);
  });
});
