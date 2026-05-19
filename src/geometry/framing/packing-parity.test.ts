import { describe, it, expect } from 'vitest';
import { framingPieces } from './index';
import { pack } from '../core/packing/nfp-packer';
import { bboxLayoutOnSheet } from '../core/packing/bbox-fallback';
import type { FramingParams } from './types';

const BASE: FramingParams = {
  mode: 'wall',
  lengthIn: 8,
  spanIn: 5.33,
  memberSpacingIn: 0.889,
  memberDepthIn: 0.5,
  nMembersOverride: null,
  endCapHeightIn: 0.125,
  endCapBDoubled: false,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.125,
  stockThicknessIn: 0.125,
  engraveStyle: 'brackets',
  spares: { members: 0, endCaps: 0, blocks: 0, spliceGussets: 0 },
  sheetWidthIn: 12,
  maxPieceLengthIn: 12,
  marginIn: 0.12,
  pieceSpacingIn: 0.06,
};

const CONFIGS: Array<{ name: string; params: FramingParams }> = [
  { name: 'tiny wall, no blocking',           params: { ...BASE, lengthIn: 4, spanIn: 3 } },
  { name: 'default wall, no blocking',        params: BASE },
  { name: 'default wall, half blocking',      params: { ...BASE, blocking: { mode: 'half', positionFraction: 0.5 } } },
  { name: 'default wall, staggered 3-2-3',    params: { ...BASE, blocking: { mode: 'staggered', denseCount: 3, sparseCount: 2, startDense: true } } },
  { name: 'tall wall, half blocking',         params: { ...BASE, spanIn: 10, blocking: { mode: 'half', positionFraction: 0.5 } } },
  { name: 'long wall (plate split needed)',   params: { ...BASE, lengthIn: 20, maxPieceLengthIn: 8 } },
  { name: 'override 6 studs, staggered',      params: { ...BASE, nMembersOverride: 6, blocking: { mode: 'staggered', denseCount: 3, sparseCount: 2, startDense: true } } },
  { name: 'doubled top plate',                params: { ...BASE, endCapBDoubled: true, blocking: { mode: 'half', positionFraction: 0.5 } } },
  { name: 'default + default spares',         params: { ...BASE, blocking: { mode: 'staggered', denseCount: 3, sparseCount: 2, startDense: true }, spares: { members: 1, endCaps: 0, blocks: 3, spliceGussets: 2 } } },
  { name: 'huge spares (stress test)',        params: { ...BASE, blocking: { mode: 'half', positionFraction: 0.5 }, spares: { members: 5, endCaps: 2, blocks: 20, spliceGussets: 5 } } },
  { name: 'floor mode, half blocking',        params: { ...BASE, mode: 'floor', blocking: { mode: 'half', positionFraction: 0.5 } } },
  { name: 'floor mode, staggered, w/ spares', params: { ...BASE, mode: 'floor', blocking: { mode: 'staggered', denseCount: 3, sparseCount: 2, startDense: true }, spares: { members: 1, endCaps: 0, blocks: 3, spliceGussets: 0 } } },
  { name: 'custom blocking at bay -1',        params: { ...BASE, blocking: { mode: 'custom', rows: [{ bayIndex: -1, positionFraction: 0.25 }, { bayIndex: -1, positionFraction: 0.75 }] } } },
  { name: 'narrow sheet (forces tight pack)', params: { ...BASE, sheetWidthIn: 8, blocking: { mode: 'half', positionFraction: 0.5 } } },
];

describe('packing parity -- no pieces dropped across many configs', () => {
  for (const { name, params } of CONFIGS) {
    it(`bbox-fallback places every piece for: ${name}`, () => {
      const result = framingPieces(params);
      const layout = bboxLayoutOnSheet(result.pieces, result.sheet);
      expect(layout.placed.length).toBe(result.pieces.length);
    });
    it(`nfp-packer places every piece for: ${name}`, () => {
      const result = framingPieces(params);
      const pk = pack(result.pieces, result.sheet, { rotations: [0, 90], pieceSpacingIn: 0.06, effort: 'realtime' });
      const failedLabels = pk.warnings.filter((w) => w.includes('did not fit')).join('; ');
      expect(pk.placed.length, `dropped: ${failedLabels}`).toBe(result.pieces.length);
    });
  }
});
