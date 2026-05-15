import { load, save } from './storage';
import type { RoofParams } from '../../geometry/roof/types';
import type { WallParams } from '../../geometry/wall/types';

export interface ToolPreset<P> {
  id: string;
  toolSlug: string;
  name: string;
  params: P;
  createdAt: string;
  builtin?: boolean;
}

const userKey = (slug: string) => `mt:tool:${slug}`;
const activeKey = (slug: string) => `mt:active-tool:${slug}`;

const ROOF_DEFAULT: RoofParams = {
  spanIn: 8.75, pitchRise: 8, pitchRun: 12, rafterDepthIn: 0.5,
  wallThicknessIn: 0.25, overhangRunIn: 0.5,
  houseLengthIn: 10.0, rafterSpacingIn: 0.875, topPlateHeightIn: 0.25,
  nPairsOverride: 2, sheetWidthIn: 12.0, maxPieceLengthIn: 12.0, marginIn: 0.12,
  pieceSpacingIn: 0.06,
  ridgeEndMarginIn: 0,
  ridgeFaceMarginIn: 0.125,
};

export const BUILTIN_ROOF_PRESETS: ToolPreset<RoofParams>[] = [
  { id: 'roof-1-18-default', toolSlug: 'roof', name: '1:18 gable (default)', params: ROOF_DEFAULT, createdAt: '2026-05-12T00:00:00Z', builtin: true },
  { id: 'roof-low-slope', toolSlug: 'roof', name: 'Low slope 3/12', params: { ...ROOF_DEFAULT, pitchRise: 3 }, createdAt: '2026-05-12T00:00:00Z', builtin: true },
  { id: 'roof-cabin-12-12', toolSlug: 'roof', name: 'Cabin loft 12/12', params: { ...ROOF_DEFAULT, pitchRise: 12 }, createdAt: '2026-05-12T00:00:00Z', builtin: true },
];

const WALL_DEFAULT: WallParams = {
  widthIn: 8.0,
  heightIn: 5.33,
  studSpacingIn: 0.889,
  studWidthIn: 0.083,
  studDepthIn: 0.194,
  nStudsOverride: null,
  topPlateHeightIn: 0.083,
  bottomPlateHeightIn: 0.083,
  doubleTopPlate: false,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.083,
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
  pieceSpacingIn: 0.06,
};

export const BUILTIN_WALL_PRESETS: ToolPreset<WallParams>[] = [
  { id: 'wall-1-18-simple', toolSlug: 'wall', name: '1:18 simple wall', params: WALL_DEFAULT, createdAt: '2026-05-15T00:00:00Z', builtin: true },
  { id: 'wall-1-18-tall', toolSlug: 'wall', name: '1:18 tall wall (10 ft)', params: { ...WALL_DEFAULT, heightIn: 6.67, blocking: { mode: 'half', heightFraction: 0.5 } }, createdAt: '2026-05-15T00:00:00Z', builtin: true },
];

const isToolPreset = (x: unknown): x is ToolPreset<unknown> => {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.toolSlug === 'string' &&
    typeof o.name === 'string' &&
    typeof o.createdAt === 'string' &&
    typeof o.params === 'object' && o.params !== null
  );
};

function builtinsFor(slug: string): ToolPreset<unknown>[] {
  if (slug === 'roof') return BUILTIN_ROOF_PRESETS as ToolPreset<unknown>[];
  if (slug === 'wall') return BUILTIN_WALL_PRESETS as ToolPreset<unknown>[];
  return [];
}

export function listToolPresets<P>(slug: string): ToolPreset<P>[] {
  const builtins = builtinsFor(slug) as ToolPreset<P>[];
  const userAll = load<ToolPreset<unknown>>(userKey(slug), isToolPreset);
  const user = userAll.filter((p) => p.toolSlug === slug) as ToolPreset<P>[];
  return [...builtins, ...user];
}

export function saveToolPreset<P>(slug: string, preset: ToolPreset<P>): void {
  const all = load<ToolPreset<unknown>>(userKey(slug), isToolPreset).filter((p) => p.id !== preset.id);
  save(userKey(slug), [...all, preset as ToolPreset<unknown>]);
}

export function setActiveToolPresetId(slug: string, id: string): void {
  localStorage.setItem(activeKey(slug), id);
}

export function getActiveToolPreset<P>(slug: string): ToolPreset<P> {
  const all = listToolPresets<P>(slug);
  const id = localStorage.getItem(activeKey(slug));
  return all.find((p) => p.id === id) ?? all[0];
}
