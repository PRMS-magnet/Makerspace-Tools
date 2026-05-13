import { describe, it, expect, beforeEach, vi } from 'vitest';
import { load, save, clearAll } from './storage';

interface Foo { id: string; n: number }
const isFoo = (x: unknown): x is Foo =>
  typeof x === 'object' && x !== null &&
  typeof (x as { id?: unknown }).id === 'string' &&
  typeof (x as { n?: unknown }).n === 'number';

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  });
});

describe('storage.load', () => {
  it('returns empty array when key is missing', () => {
    expect(load('mt:test', isFoo)).toEqual([]);
  });

  it('returns saved values', () => {
    save('mt:test', [{ id: 'a', n: 1 }]);
    expect(load('mt:test', isFoo)).toEqual([{ id: 'a', n: 1 }]);
  });

  it('skips invalid entries', () => {
    localStorage.setItem('mt:test', JSON.stringify([{ id: 'a', n: 1 }, { id: 'b' }, 'not-an-object']));
    expect(load('mt:test', isFoo)).toEqual([{ id: 'a', n: 1 }]);
  });

  it('returns empty array on malformed JSON', () => {
    localStorage.setItem('mt:test', 'not json');
    expect(load('mt:test', isFoo)).toEqual([]);
  });

  it('returns empty array when stored value is not an array', () => {
    localStorage.setItem('mt:test', JSON.stringify({ id: 'a', n: 1 }));
    expect(load('mt:test', isFoo)).toEqual([]);
  });
});

describe('storage.save', () => {
  it('serializes to JSON', () => {
    save('mt:test', [{ id: 'a', n: 1 }]);
    expect(JSON.parse(localStorage.getItem('mt:test')!)).toEqual([{ id: 'a', n: 1 }]);
  });

  it('replaces existing data', () => {
    save('mt:test', [{ id: 'a', n: 1 }]);
    save('mt:test', [{ id: 'b', n: 2 }]);
    expect(load('mt:test', isFoo)).toEqual([{ id: 'b', n: 2 }]);
  });
});

describe('storage.clearAll', () => {
  it('clears a single key', () => {
    save('mt:test', [{ id: 'a', n: 1 }]);
    clearAll('mt:test');
    expect(load('mt:test', isFoo)).toEqual([]);
  });
});
