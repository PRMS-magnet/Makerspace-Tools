import { describe, it, expect } from 'vitest';
import { verifyFraming } from './verify';
import { buildFramingCutListPieces } from './cutlist';
import { computeFramingPieces3D } from './place3d';
import type { FramingParams } from './types';
import type { Piece, Piece3D } from '../core/types';

const BASE: FramingParams = {
  mode: 'wall',
  lengthIn: 8,
  spanIn: 5.33,
  memberSpacingIn: 0.889,
  memberDepthIn: 0.5,
  nMembersOverride: 6,
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

function build(p: FramingParams) {
  const cut = buildFramingCutListPieces(p, 'main').pieces;
  const three = computeFramingPieces3D(p, 'main');
  return { cut, three };
}

describe('verifyFraming - sanity layer', () => {
  it('passes for a default wall with no blocking', () => {
    const { cut, three } = build(BASE);
    const r = verifyFraming(BASE, cut, three);
    expect(r.ok).toBe(true);
    expect(r.errors.filter((e) => e.layer === 'sanity')).toEqual([]);
  });

  it('detects a count mismatch between cut and 3D for any piece kind', () => {
    const { cut, three } = build(BASE);
    const truncatedThree = three.filter((p) => p.placement?.kind !== 'framing-member' || (p.placement as { indexAlongLength: number }).indexAlongLength !== 0) as Piece3D[];
    const r = verifyFraming(BASE, cut, truncatedThree);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.layer === 'sanity' && e.message.includes('framing-member'))).toBe(true);
  });

  it('detects a dimension mismatch between paired cut and 3D pieces', () => {
    const { cut, three } = build(BASE);
    const tampered: Piece3D[] = three.map((p) => {
      if (p.placement?.kind !== 'framing-end-cap') return p;
      return { ...p, polygon: [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]] };
    });
    const r = verifyFraming(BASE, cut, tampered);
    expect(r.errors.some((e) => e.layer === 'sanity' && e.message.includes('does not match'))).toBe(true);
  });

  it('passes when blocks have matching dims (cuts at memberDepth like 3D)', () => {
    const params = { ...BASE, blocking: { mode: 'half' as const, positionFraction: 0.5 } };
    const { cut, three } = build(params);
    const r = verifyFraming(params, cut, three);
    expect(r.errors.filter((e) => e.layer === 'sanity')).toEqual([]);
  });
});

describe('verifyFraming - geometric layer', () => {
  it('passes for a default wall (no overlaps)', () => {
    const { cut, three } = build(BASE);
    const r = verifyFraming(BASE, cut, three);
    expect(r.errors.filter((e) => e.layer === 'geometric')).toEqual([]);
  });

  it('detects an overlap when two pieces are placed at the same position', () => {
    const { cut, three } = build(BASE);
    // Duplicate one stud at exactly the same origin -> overlap with itself
    const studIdx = three.findIndex((p) => p.placement?.kind === 'framing-member');
    if (studIdx < 0) throw new Error('no member');
    const duplicated = [...three, { ...three[studIdx] }];
    const r = verifyFraming(BASE, cut, duplicated);
    expect(r.errors.some((e) => e.layer === 'geometric' && e.message.includes('overlap'))).toBe(true);
  });
});

describe('verifyFraming - fabrication layer', () => {
  it('passes for the default wall (all pieces above min feature size)', () => {
    const { cut, three } = build(BASE);
    const r = verifyFraming(BASE, cut, three);
    expect(r.errors.filter((e) => e.layer === 'fabrication')).toEqual([]);
  });

  it('warns when a piece is smaller than 3x kerf width', () => {
    const params = { ...BASE, memberDepthIn: 0.03 };
    const { cut, three } = build(params);
    const r = verifyFraming(params, cut, three);
    expect(r.errors.some((e) => e.layer === 'fabrication' && e.severity === 'warning' && e.message.includes('min'))).toBe(true);
  });

  it('errors when a piece short dim is larger than the usable sheet width', () => {
    // Force a member depth that exceeds the usable sheet width -- the member's
    // short dim (memberDepth) cannot fit at any rotation.
    const params = { ...BASE, memberDepthIn: 6, sheetWidthIn: 4, maxPieceLengthIn: 12 };
    const { cut, three } = build(params);
    const r = verifyFraming(params, cut, three);
    expect(r.errors.some((e) => e.layer === 'fabrication' && e.severity === 'error' && e.message.includes('exceeds usable sheet width'))).toBe(true);
  });

  it('warns (not errors) when a member long dim exceeds maxPieceLength but still fits the sheet', () => {
    // Members don't auto-split, so a tall wall surfaces a long member that fits the
    // sheet width but exceeds maxPieceLength.
    const params = { ...BASE, spanIn: 15, sheetWidthIn: 18, maxPieceLengthIn: 12 };
    const { cut, three } = build(params);
    const r = verifyFraming(params, cut, three);
    expect(r.errors.some((e) => e.layer === 'fabrication' && e.severity === 'warning' && e.message.includes('exceeds max piece length'))).toBe(true);
  });
});

describe('verifyFraming - structural layer', () => {
  it('passes for the default wall (every piece connected, members touch both plates)', () => {
    const { cut, three } = build(BASE);
    const r = verifyFraming(BASE, cut, three);
    expect(r.errors.filter((e) => e.layer === 'structural')).toEqual([]);
  });

  it('flags a floating piece (no face contact with any other)', () => {
    const { cut, three } = build(BASE);
    // Move one stud far away so it has no face contact with anything.
    const studIdx = three.findIndex((p) => p.placement?.kind === 'framing-member');
    const tampered: Piece3D[] = three.map((p, i) =>
      i === studIdx ? { ...p, origin: [100, 100, 100] as readonly [number, number, number] } : p
    );
    const r = verifyFraming(BASE, cut, tampered);
    expect(r.errors.some((e) => e.layer === 'structural' && (e.message.includes('disconnected') || e.message.includes('touches only') || e.message.includes('touches no')))).toBe(true);
  });

  it('flags a block that does not touch two members (e.g., wrong bay position)', () => {
    const params = { ...BASE, blocking: { mode: 'half' as const, positionFraction: 0.5 } };
    const { cut, three } = build(params);
    // Move one block so it no longer butts up against its two adjacent studs.
    const blockIdx = three.findIndex((p) => p.placement?.kind === 'framing-block');
    const orig = three[blockIdx].origin;
    const tampered: Piece3D[] = three.map((p, i) =>
      i === blockIdx ? { ...p, origin: [orig[0] + 0.5, orig[1], orig[2]] as readonly [number, number, number] } : p
    );
    const r = verifyFraming(params, cut, tampered);
    expect(r.errors.some((e) => e.layer === 'structural' && e.message.includes('block'))).toBe(true);
  });
});

describe('verifyFraming - overall', () => {
  it('ok=true when there are no errors (warnings allowed)', () => {
    const { cut, three } = build(BASE);
    const r = verifyFraming(BASE, cut, three);
    expect(r.ok).toBe(true);
  });

  it('ok=false when any error is present', () => {
    const cut: Piece[] = [];
    const { three } = build(BASE);
    const r = verifyFraming(BASE, cut, three);
    expect(r.ok).toBe(false);
  });
});
