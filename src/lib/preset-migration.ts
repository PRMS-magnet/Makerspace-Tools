const FLAG = 'mt:migration:wall-floor->framing:v1';

interface OldWallParams {
  widthIn: number; heightIn: number; studSpacingIn: number;
  studDepthIn: number; nStudsOverride: number | null;
  bottomPlateHeightIn: number; topPlateHeightIn: number; doubleTopPlate: boolean;
  blocking: unknown; blockingThicknessIn: number; stockThicknessIn: number;
  sheetWidthIn: number; maxPieceLengthIn: number; marginIn: number;
  pieceSpacingIn?: number;
}

interface OldFloorParams {
  widthIn: number; depthIn: number; joistSpacingIn: number;
  joistDepthIn: number; nJoistsOverride: number | null;
  rimThicknessIn: number;
  blocking: unknown; blockingThicknessIn: number; stockThicknessIn: number;
  sheetWidthIn: number; maxPieceLengthIn: number; marginIn: number;
  pieceSpacingIn?: number;
}

function migrateWallParams(p: OldWallParams): Record<string, unknown> {
  return {
    mode: 'wall',
    lengthIn: p.widthIn,
    spanIn: p.heightIn,
    memberSpacingIn: p.studSpacingIn,
    memberDepthIn: p.studDepthIn,
    nMembersOverride: p.nStudsOverride,
    endCapHeightIn: p.bottomPlateHeightIn ?? p.topPlateHeightIn ?? p.stockThicknessIn,
    endCapBDoubled: !!p.doubleTopPlate,
    blocking: migrateBlocking(p.blocking, 'wall'),
    blockingThicknessIn: p.blockingThicknessIn,
    stockThicknessIn: p.stockThicknessIn,
    sheetWidthIn: p.sheetWidthIn,
    maxPieceLengthIn: p.maxPieceLengthIn,
    marginIn: p.marginIn,
    pieceSpacingIn: p.pieceSpacingIn,
  };
}

function migrateFloorParams(p: OldFloorParams): Record<string, unknown> {
  return {
    mode: 'floor',
    lengthIn: p.widthIn,
    spanIn: p.depthIn,
    memberSpacingIn: p.joistSpacingIn,
    memberDepthIn: p.joistDepthIn,
    nMembersOverride: p.nJoistsOverride,
    endCapHeightIn: p.rimThicknessIn ?? p.stockThicknessIn,
    endCapBDoubled: false,
    blocking: migrateBlocking(p.blocking, 'floor'),
    blockingThicknessIn: p.blockingThicknessIn,
    stockThicknessIn: p.stockThicknessIn,
    sheetWidthIn: p.sheetWidthIn,
    maxPieceLengthIn: p.maxPieceLengthIn,
    marginIn: p.marginIn,
    pieceSpacingIn: p.pieceSpacingIn,
  };
}

function migrateBlocking(blocking: unknown, kind: 'wall' | 'floor'): unknown {
  if (!blocking || typeof blocking !== 'object') return { mode: 'none' };
  const b = blocking as Record<string, unknown>;
  if (b.mode === 'half') {
    const frac = kind === 'wall' ? b.heightFraction : b.positionFraction;
    return { mode: 'half', positionFraction: Number(frac ?? 0.5) };
  }
  if (b.mode === 'custom' && Array.isArray(b.rows)) {
    return {
      mode: 'custom',
      rows: b.rows.map((r: Record<string, unknown>) => ({
        bayIndex: Number(r.bayIndex ?? 0),
        positionFraction: Number((kind === 'wall' ? r.heightFraction : r.positionFraction) ?? 0.5),
      })),
    };
  }
  return blocking;
}

export function migrateWallFloorToFraming(): void {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(FLAG)) return;

  const existing = localStorage.getItem('mt:tool:framing');
  const acc: unknown[] = existing ? JSON.parse(existing) : [];

  for (const oldSlug of ['wall', 'floor'] as const) {
    const raw = localStorage.getItem(`mt:tool:${oldSlug}`);
    if (!raw) continue;
    try {
      const arr = JSON.parse(raw) as Array<{ params: Record<string, unknown> } & Record<string, unknown>>;
      for (const preset of arr) {
        const migrated = {
          ...preset,
          toolSlug: 'framing',
          params: oldSlug === 'wall'
            ? migrateWallParams(preset.params as unknown as OldWallParams)
            : migrateFloorParams(preset.params as unknown as OldFloorParams),
        };
        acc.push(migrated);
      }
    } catch {}
  }

  if (acc.length > 0) localStorage.setItem('mt:tool:framing', JSON.stringify(acc));
  localStorage.setItem(FLAG, '1');
}
