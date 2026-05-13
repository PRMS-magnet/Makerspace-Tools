import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BUILTIN_MATERIALS, listMaterials, saveMaterial, getActiveMaterial, setActiveMaterialId } from './material';

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  });
});

describe('BUILTIN_MATERIALS', () => {
  it('includes 1/8 and 1/4 basswood + baltic birch', () => {
    const ids = BUILTIN_MATERIALS.map((m) => m.id);
    expect(ids).toContain('basswood-1-8');
    expect(ids).toContain('basswood-1-4');
    expect(ids).toContain('baltic-birch-1-8');
  });

  it('1/8" basswood stock thickness is 0.125', () => {
    const m = BUILTIN_MATERIALS.find((x) => x.id === 'basswood-1-8')!;
    expect(m.stockThicknessIn).toBe(0.125);
  });
});

describe('listMaterials / saveMaterial', () => {
  it('returns built-ins when empty', () => {
    expect(listMaterials().length).toBe(BUILTIN_MATERIALS.length);
  });

  it('appends user saves', () => {
    saveMaterial({ id: 'mdf', name: 'MDF 3mm', stockThicknessIn: 0.118, sheetWidthIn: 24, sheetLengthIn: 18 });
    expect(listMaterials().length).toBe(BUILTIN_MATERIALS.length + 1);
  });
});

describe('active material', () => {
  it('defaults to first built-in', () => {
    expect(getActiveMaterial().id).toBe(BUILTIN_MATERIALS[0].id);
  });

  it('respects setActiveMaterialId', () => {
    setActiveMaterialId('basswood-1-4');
    expect(getActiveMaterial().id).toBe('basswood-1-4');
  });
});
