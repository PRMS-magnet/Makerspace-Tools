import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BUILTIN_MACHINES, listMachines, saveMachine, getActiveMachine, setActiveMachineId } from './machine';

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  });
});

describe('BUILTIN_MACHINES', () => {
  it('includes xTool M1 / S1 / P2 and Glowforge', () => {
    const ids = BUILTIN_MACHINES.map((m) => m.id);
    expect(ids).toContain('xtool-m1');
    expect(ids).toContain('xtool-s1');
    expect(ids).toContain('xtool-p2');
    expect(ids).toContain('glowforge-basic');
  });

  it('xTool M1 has 11.81 x 11.81 work area', () => {
    const m1 = BUILTIN_MACHINES.find((m) => m.id === 'xtool-m1')!;
    expect(m1.workAreaIn.width).toBeCloseTo(11.81, 2);
    expect(m1.workAreaIn.height).toBeCloseTo(11.81, 2);
  });

  it('every built-in has builtin: true', () => {
    for (const m of BUILTIN_MACHINES) expect(m.builtin).toBe(true);
  });
});

describe('listMachines', () => {
  it('returns built-ins when localStorage is empty', () => {
    const list = listMachines();
    expect(list.length).toBe(BUILTIN_MACHINES.length);
  });

  it('appends user saves after built-ins', () => {
    saveMachine({ id: 'custom', name: 'My machine', workAreaIn: { width: 20, height: 15 }, kerfIn: 0.01 });
    const list = listMachines();
    expect(list.length).toBe(BUILTIN_MACHINES.length + 1);
    expect(list[list.length - 1].id).toBe('custom');
  });
});

describe('active machine selection', () => {
  it('defaults to first built-in when none set', () => {
    const active = getActiveMachine();
    expect(active.id).toBe(BUILTIN_MACHINES[0].id);
  });

  it('respects setActiveMachineId', () => {
    setActiveMachineId('xtool-p2');
    expect(getActiveMachine().id).toBe('xtool-p2');
  });

  it('falls back to first built-in if the active id no longer exists', () => {
    setActiveMachineId('ghost');
    expect(getActiveMachine().id).toBe(BUILTIN_MACHINES[0].id);
  });
});
