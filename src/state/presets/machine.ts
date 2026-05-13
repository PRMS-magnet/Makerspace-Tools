import { load, save } from './storage';

export interface MachinePreset {
  id: string;
  name: string;
  workAreaIn: { width: number; height: number };
  kerfIn: number;
  builtin?: boolean;
}

const KEY_USER = 'mt:machines';
const KEY_ACTIVE = 'mt:active-machine';

export const BUILTIN_MACHINES = [
  { id: 'xtool-h2s', name: 'xTool H2S', workAreaIn: { width: 35.4, height: 12.6 }, kerfIn: 0.008, builtin: true },
  { id: 'xtool-m1', name: 'xTool M1', workAreaIn: { width: 11.81, height: 11.81 }, kerfIn: 0.005, builtin: true },
  { id: 'xtool-s1', name: 'xTool S1', workAreaIn: { width: 19.6, height: 13 }, kerfIn: 0.005, builtin: true },
  { id: 'xtool-p2', name: 'xTool P2', workAreaIn: { width: 23.6, height: 12.1 }, kerfIn: 0.005, builtin: true },
  { id: 'glowforge-basic', name: 'Glowforge Basic', workAreaIn: { width: 19.5, height: 11 }, kerfIn: 0.005, builtin: true },
  { id: 'generic-12', name: 'Generic 12x12', workAreaIn: { width: 12, height: 12 }, kerfIn: 0.005, builtin: true },
] as const satisfies readonly MachinePreset[];

const isMachine = (x: unknown): x is MachinePreset => {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string' || typeof o.kerfIn !== 'number') return false;
  if (typeof o.workAreaIn !== 'object' || o.workAreaIn === null) return false;
  const w = o.workAreaIn as Record<string, unknown>;
  return typeof w.width === 'number' && typeof w.height === 'number';
};

export function listMachines(): MachinePreset[] {
  return [...BUILTIN_MACHINES, ...load<MachinePreset>(KEY_USER, isMachine)];
}

export function saveMachine(m: MachinePreset): void {
  const existing = load<MachinePreset>(KEY_USER, isMachine).filter((x) => x.id !== m.id);
  save(KEY_USER, [...existing, m]);
}

export function setActiveMachineId(id: string): void {
  localStorage.setItem(KEY_ACTIVE, id);
}

export function getActiveMachine(): MachinePreset {
  const all = listMachines();
  const id = localStorage.getItem(KEY_ACTIVE);
  return all.find((m) => m.id === id) ?? all[0];
}
