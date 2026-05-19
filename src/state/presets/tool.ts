import { load, save } from './storage';
import type { RoofParams } from '../../geometry/roof/types';
import type { FramingParams } from '../../geometry/framing/types';
import { DEFAULT_SPARES } from '../../geometry/framing/types';

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

const FRAMING_DEFAULT_WALL: FramingParams = {
  mode: 'wall',
  lengthIn: 8.0,
  spanIn: 5.33,
  memberSpacingIn: 0.889,
  memberDepthIn: 0.25,
  nMembersOverride: null,
  endCapHeightIn: 0.125,
  endCapBDoubled: false,
  blocking: { mode: 'none' },
  blockingThicknessIn: 0.125,
  stockThicknessIn: 0.125,
  engraveStyle: 'brackets',
  spares: DEFAULT_SPARES,
  sheetWidthIn: 12.0,
  maxPieceLengthIn: 12.0,
  marginIn: 0.12,
  pieceSpacingIn: 0.06,
};

const FRAMING_DEFAULT_FLOOR: FramingParams = {
  ...FRAMING_DEFAULT_WALL,
  mode: 'floor',
  spanIn: 6.67,
};

export const BUILTIN_FRAMING_PRESETS: ToolPreset<FramingParams>[] = [
  { id: 'framing-1-18-wall', toolSlug: 'framing', name: '1:18 simple wall', params: FRAMING_DEFAULT_WALL, createdAt: '2026-05-17T00:00:00Z', builtin: true },
  { id: 'framing-1-18-wall-tall', toolSlug: 'framing', name: '1:18 tall wall (10 ft)', params: { ...FRAMING_DEFAULT_WALL, spanIn: 6.67, blocking: { mode: 'half', positionFraction: 0.5 } }, createdAt: '2026-05-17T00:00:00Z', builtin: true },
  { id: 'framing-1-18-floor', toolSlug: 'framing', name: '1:18 floor', params: FRAMING_DEFAULT_FLOOR, createdAt: '2026-05-17T00:00:00Z', builtin: true },
  { id: 'framing-1-18-floor-blocked', toolSlug: 'framing', name: '1:18 floor with mid-span blocking', params: { ...FRAMING_DEFAULT_FLOOR, blocking: { mode: 'half', positionFraction: 0.5 } }, createdAt: '2026-05-17T00:00:00Z', builtin: true },
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
  if (slug === 'framing') return BUILTIN_FRAMING_PRESETS as ToolPreset<unknown>[];
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
