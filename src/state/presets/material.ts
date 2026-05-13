import { load, save } from './storage';

export interface MaterialPreset {
  id: string;
  name: string;
  stockThicknessIn: number;
  sheetWidthIn: number;
  sheetLengthIn: number;
  displayColor?: string;
  builtin?: boolean;
}

const KEY_USER = 'mt:materials';
const KEY_ACTIVE = 'mt:active-material';

export const BUILTIN_MATERIALS = [
  { id: 'basswood-1-8', name: 'Basswood plywood 1/8"', stockThicknessIn: 0.125, sheetWidthIn: 24, sheetLengthIn: 12, displayColor: '#e8d4a0', builtin: true },
  { id: 'basswood-1-4', name: 'Basswood plywood 1/4"', stockThicknessIn: 0.25, sheetWidthIn: 24, sheetLengthIn: 12, displayColor: '#e8d4a0', builtin: true },
  { id: 'baltic-birch-1-8', name: 'Baltic birch 1/8"', stockThicknessIn: 0.125, sheetWidthIn: 24, sheetLengthIn: 12, displayColor: '#d4b986', builtin: true },
] as const satisfies readonly MaterialPreset[];

const isMaterial = (x: unknown): x is MaterialPreset => {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.stockThicknessIn === 'number' &&
    typeof o.sheetWidthIn === 'number' &&
    typeof o.sheetLengthIn === 'number'
  );
};

export function listMaterials(): MaterialPreset[] {
  return [...BUILTIN_MATERIALS, ...load<MaterialPreset>(KEY_USER, isMaterial)];
}

export function saveMaterial(m: MaterialPreset): void {
  const existing = load<MaterialPreset>(KEY_USER, isMaterial).filter((x) => x.id !== m.id);
  save(KEY_USER, [...existing, m]);
}

export function setActiveMaterialId(id: string): void {
  localStorage.setItem(KEY_ACTIVE, id);
}

export function getActiveMaterial(): MaterialPreset {
  const all = listMaterials();
  const id = localStorage.getItem(KEY_ACTIVE);
  return all.find((m) => m.id === id) ?? all[0];
}
