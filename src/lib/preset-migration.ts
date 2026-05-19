import { DEFAULT_SPARES } from '../geometry/framing/types';

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
    engraveStyle: 'brackets',
    spares: DEFAULT_SPARES,
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
    engraveStyle: 'brackets',
    spares: DEFAULT_SPARES,
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

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded, storage disabled, etc. Migration silently best-effort.
  }
}

export function migrateWallFloorToFraming(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (localStorage.getItem(FLAG)) return;
  } catch {
    return;
  }

  const existingRaw = safeReadJson<unknown>('mt:tool:framing', []);
  const acc: unknown[] = Array.isArray(existingRaw) ? [...existingRaw] : [];

  for (const oldSlug of ['wall', 'floor'] as const) {
    const arr = safeReadJson<unknown>(`mt:tool:${oldSlug}`, null);
    if (!Array.isArray(arr)) continue;
    for (const presetRaw of arr) {
      if (!presetRaw || typeof presetRaw !== 'object') continue;
      const preset = presetRaw as { params?: unknown } & Record<string, unknown>;
      if (!preset.params || typeof preset.params !== 'object') continue;
      try {
        const migrated = {
          ...preset,
          toolSlug: 'framing',
          params: oldSlug === 'wall'
            ? migrateWallParams(preset.params as unknown as OldWallParams)
            : migrateFloorParams(preset.params as unknown as OldFloorParams),
        };
        acc.push(migrated);
      } catch {
        // Skip any individual preset that fails to migrate; keep going.
      }
    }
  }

  if (acc.length > 0) safeWriteJson('mt:tool:framing', acc);
  try {
    localStorage.setItem(FLAG, '1');
  } catch {
    // Migration may re-run on next page load; harmless.
  }
}
