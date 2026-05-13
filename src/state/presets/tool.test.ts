import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listToolPresets, saveToolPreset, getActiveToolPreset, setActiveToolPresetId, BUILTIN_ROOF_PRESETS } from './tool';
import type { RoofParams } from '../../geometry/roof/types';

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  });
});

describe('BUILTIN_ROOF_PRESETS', () => {
  it('includes a default 1:18 gable preset', () => {
    expect(BUILTIN_ROOF_PRESETS.some((p) => p.id === 'roof-1-18-default')).toBe(true);
  });

  it('all entries have toolSlug "roof"', () => {
    for (const p of BUILTIN_ROOF_PRESETS) expect(p.toolSlug).toBe('roof');
  });
});

describe('listToolPresets', () => {
  it('filters by slug and includes built-ins', () => {
    const list = listToolPresets<RoofParams>('roof');
    expect(list.length).toBeGreaterThanOrEqual(BUILTIN_ROOF_PRESETS.length);
  });

  it('returns empty for unknown slug', () => {
    expect(listToolPresets('unknown-tool')).toEqual([]);
  });
});

describe('saveToolPreset / getActiveToolPreset', () => {
  it('round-trips a user preset', () => {
    const sample: RoofParams = {
      spanIn: 9, pitchRise: 6, pitchRun: 12, rafterDepthIn: 0.5,
      wallThicknessIn: 0.25, overhangRunIn: 0.5,
      houseLengthIn: 10, rafterSpacingIn: 0.875, topPlateHeightIn: 0.25,
      nPairsOverride: 2, sheetWidthIn: 12, maxPieceLengthIn: 12, marginIn: 0.12,
    };
    saveToolPreset<RoofParams>('roof', { id: 'mine', toolSlug: 'roof', name: 'Mine', params: sample, createdAt: '2026-05-12T00:00:00Z' });
    const list = listToolPresets<RoofParams>('roof');
    const mine = list.find((p) => p.id === 'mine');
    expect(mine).toBeDefined();
    expect(mine!.params.pitchRise).toBe(6);
  });

  it('getActiveToolPreset defaults to first entry', () => {
    const active = getActiveToolPreset<RoofParams>('roof');
    expect(active).toBeDefined();
  });

  it('setActiveToolPresetId changes which is active', () => {
    setActiveToolPresetId('roof', BUILTIN_ROOF_PRESETS[BUILTIN_ROOF_PRESETS.length - 1].id);
    const active = getActiveToolPreset<RoofParams>('roof');
    expect(active.id).toBe(BUILTIN_ROOF_PRESETS[BUILTIN_ROOF_PRESETS.length - 1].id);
  });
});
