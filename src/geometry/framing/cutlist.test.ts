import { describe, it, expect } from 'vitest';
import { buildFramingCutListPieces } from './cutlist';
import type { FramingParams } from './types';

const DEFAULTS: FramingParams = {
  mode: 'wall',
  lengthIn: 8.0,
  spanIn: 5.33,
  memberSpacingIn: 0.889,
  memberDepthIn: 0.25,
  nMembersOverride: 6,
  endCapHeightIn: 0.125,
  endCapBDoubled: false,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.125,
  stockThicknessIn: 0.125,
  engraveStyle: 'brackets',
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
};

describe('buildFramingCutListPieces', () => {
  it('emits endCapA + endCapB + N members for default wall mode', () => {
    const { pieces } = buildFramingCutListPieces(DEFAULTS, 'main');
    expect(pieces.filter((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'A').length).toBe(1);
    expect(pieces.filter((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'B').length).toBe(1);
    expect(pieces.filter((p) => p.placement?.kind === 'framing-member').length).toBe(6);
  });

  it('emits two endCapB segments when doubled', () => {
    const { pieces } = buildFramingCutListPieces({ ...DEFAULTS, endCapBDoubled: true }, 'main');
    expect(pieces.filter((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'B').length).toBe(2);
  });

  it('end caps carry member-position engrave marks (2 ticks per member)', () => {
    const { pieces } = buildFramingCutListPieces(DEFAULTS, 'main');
    const endCapA = pieces.find((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'A');
    expect(endCapA?.engravedFeatures?.length).toBe(12);
  });

  it('only layer 0 of a doubled end-cap B carries marks', () => {
    const { pieces } = buildFramingCutListPieces({ ...DEFAULTS, endCapBDoubled: true }, 'main');
    const tops = pieces.filter((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'B');
    const layer0 = tops.find((p) => (p.placement as { layer: number }).layer === 0)!;
    const layer1 = tops.find((p) => (p.placement as { layer: number }).layer === 1)!;
    expect(layer0.engravedFeatures?.length).toBe(12);
    expect(layer1.engravedFeatures?.length).toBe(0);
  });

  it('member cut piece dimension is memberDepth x interEndCapSpan', () => {
    const { pieces } = buildFramingCutListPieces(DEFAULTS, 'main');
    const member = pieces.find((p) => p.placement?.kind === 'framing-member')!;
    const poly = member.polygon as readonly (readonly [number, number])[];
    const xs = poly.map((v) => v[0]); const ys = poly.map((v) => v[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(0.25, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(5.33 - 0.125 - 0.125, 6);
  });

  it('end cap cut piece length = lengthIn + stockThickness', () => {
    const { pieces } = buildFramingCutListPieces(DEFAULTS, 'main');
    const endCapA = pieces.find((p) => p.placement?.kind === 'framing-end-cap')!;
    const poly = endCapA.polygon as readonly (readonly [number, number])[];
    const xs = poly.map((v) => v[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(8.0 + 0.125, 6);
  });

  it('end cap cut piece height = memberDepth (on-edge plate)', () => {
    const { pieces } = buildFramingCutListPieces(DEFAULTS, 'main');
    const endCapA = pieces.find((p) => p.placement?.kind === 'framing-end-cap')!;
    const poly = endCapA.polygon as readonly (readonly [number, number])[];
    const ys = poly.map((v) => v[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.25, 6);
  });

  it('emits blocks for half-mode blocking', () => {
    const { pieces } = buildFramingCutListPieces(
      { ...DEFAULTS, blocking: { mode: 'half', positionFraction: 0.5 } },
      'main',
    );
    expect(pieces.filter((p) => p.placement?.kind === 'framing-block').length).toBe(5);
  });

  it('block cut piece is bayWidth x memberDepth (tracks memberDepth, not blockingThickness)', () => {
    const params = { ...DEFAULTS, blocking: { mode: 'half' as const, positionFraction: 0.5 }, memberDepthIn: 0.4, blockingThicknessIn: 0.0625 };
    const { pieces } = buildFramingCutListPieces(params, 'main');
    const block = pieces.find((p) => p.placement?.kind === 'framing-block')!;
    const poly = block.polygon as readonly (readonly [number, number])[];
    const ys = poly.map((v) => v[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.4, 6);
  });

  it('splits end caps when length exceeds maxPieceLength', () => {
    const { pieces, warnings } = buildFramingCutListPieces(
      { ...DEFAULTS, lengthIn: 20, maxPieceLengthIn: 8 },
      'main',
    );
    const segs = pieces.filter((p) => p.placement?.kind === 'framing-end-cap' && p.placement.endCap === 'A');
    expect(segs.length).toBeGreaterThanOrEqual(3);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('floor mode produces the same piece counts as wall mode given equivalent params', () => {
    const wall = buildFramingCutListPieces(DEFAULTS, 'main').pieces;
    const floor = buildFramingCutListPieces({ ...DEFAULTS, mode: 'floor' }, 'main').pieces;
    expect(wall.length).toBe(floor.length);
  });
});

describe('engraveStyle', () => {
  it('none emits zero marks on end caps and members', () => {
    const { pieces } = buildFramingCutListPieces(
      { ...DEFAULTS, engraveStyle: 'none', blocking: { mode: 'half', positionFraction: 0.5 } },
      'main',
    );
    for (const p of pieces) {
      expect(p.engravedFeatures?.length ?? 0).toBe(0);
    }
  });

  it('solid emits one filled rectangle per position (vs 2 ticks for brackets)', () => {
    const brackets = buildFramingCutListPieces({ ...DEFAULTS, engraveStyle: 'brackets' }, 'main').pieces;
    const solid = buildFramingCutListPieces({ ...DEFAULTS, engraveStyle: 'solid' }, 'main').pieces;
    const bracketEndCap = brackets.find((p) => p.placement?.kind === 'framing-end-cap')!;
    const solidEndCap = solid.find((p) => p.placement?.kind === 'framing-end-cap')!;
    expect(bracketEndCap.engravedFeatures?.length).toBe(12); // 6 members x 2 ticks
    expect(solidEndCap.engravedFeatures?.length).toBe(6);    // 6 members x 1 solid
  });
});

describe('member blocking marks', () => {
  it('members get no blocking marks when blocking is none', () => {
    const { pieces } = buildFramingCutListPieces(DEFAULTS, 'main');
    for (const p of pieces.filter((x) => x.placement?.kind === 'framing-member')) {
      expect(p.engravedFeatures?.length ?? 0).toBe(0);
    }
  });

  it('half-mode blocking puts marks on every stud except the last (right-bay convention)', () => {
    const { pieces } = buildFramingCutListPieces(
      { ...DEFAULTS, blocking: { mode: 'half', positionFraction: 0.5 } },
      'main',
    );
    const members = pieces
      .filter((p) => p.placement?.kind === 'framing-member')
      .sort((a, b) => (a.placement as { indexAlongLength: number }).indexAlongLength - (b.placement as { indexAlongLength: number }).indexAlongLength);
    // 6 studs, 5 bays, all at position 0.5. Each stud i owns bay i, so studs 0..4 get
    // 1 position -> 2 brackets each; stud 5 (rightmost) has no bay 5 -> 0 marks.
    for (let i = 0; i < members.length - 1; i++) {
      expect(members[i].engravedFeatures?.length).toBe(2);
    }
    expect(members[members.length - 1].engravedFeatures?.length).toBe(0);
  });

  it('solid engrave style emits one filled mark per blocking position on the owning stud', () => {
    const { pieces } = buildFramingCutListPieces(
      { ...DEFAULTS, blocking: { mode: 'half', positionFraction: 0.5 }, engraveStyle: 'solid' },
      'main',
    );
    const members = pieces
      .filter((p) => p.placement?.kind === 'framing-member')
      .sort((a, b) => (a.placement as { indexAlongLength: number }).indexAlongLength - (b.placement as { indexAlongLength: number }).indexAlongLength);
    for (let i = 0; i < members.length - 1; i++) {
      expect(members[i].engravedFeatures?.length).toBe(1);
    }
    expect(members[members.length - 1].engravedFeatures?.length).toBe(0);
  });

  it('staggered 3-2-3 marks each stud with only its own bay (no double-marking from both sides)', () => {
    const { pieces } = buildFramingCutListPieces(
      { ...DEFAULTS, blocking: { mode: 'staggered', denseCount: 3, sparseCount: 2, startDense: true } },
      'main',
    );
    const members = pieces
      .filter((p) => p.placement?.kind === 'framing-member')
      .sort((a, b) => (a.placement as { indexAlongLength: number }).indexAlongLength - (b.placement as { indexAlongLength: number }).indexAlongLength);
    // 6 studs, 5 bays: dense(3) sparse(2) dense(3) sparse(2) dense(3).
    // stud i owns bay i: stud 0 -> 3 marks * 2 brackets = 6; stud 1 -> 2 * 2 = 4;
    // stud 2 -> 3 * 2 = 6; stud 3 -> 2 * 2 = 4; stud 4 -> 3 * 2 = 6; stud 5 -> 0 (no bay 5).
    expect(members[0].engravedFeatures?.length).toBe(6);
    expect(members[1].engravedFeatures?.length).toBe(4);
    expect(members[2].engravedFeatures?.length).toBe(6);
    expect(members[3].engravedFeatures?.length).toBe(4);
    expect(members[4].engravedFeatures?.length).toBe(6);
    expect(members[5].engravedFeatures?.length).toBe(0);
  });

  it('full-length blocking (custom bayIndex=-1) marks every stud including the rightmost', () => {
    const { pieces } = buildFramingCutListPieces(
      { ...DEFAULTS, blocking: { mode: 'custom', rows: [{ bayIndex: -1, positionFraction: 0.3 }] } },
      'main',
    );
    const members = pieces.filter((p) => p.placement?.kind === 'framing-member');
    expect(members.length).toBe(6);
    // Full-length blocks span the whole panel so they DO get marked on every stud,
    // including the rightmost (no bay-ownership exception for full-length).
    for (const m of members) {
      expect(m.engravedFeatures?.length).toBe(2);
    }
  });
});
