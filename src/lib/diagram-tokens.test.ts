import { describe, it, expect } from 'vitest';
import { LIGHT_TOKENS, DARK_TOKENS, getCurrentTokens, type DiagramTokens } from './diagram-tokens';

describe('diagram-tokens', () => {
  it('LIGHT_TOKENS has the documented light hex values', () => {
    expect(LIGHT_TOKENS.fillWood).toBe('#FAC775');
    expect(LIGHT_TOKENS.strokeWood).toBe('#854F0B');
    expect(LIGHT_TOKENS.fillStruct).toBe('#CECBF6');
    expect(LIGHT_TOKENS.strokeStruct).toBe('#3C3489');
    expect(LIGHT_TOKENS.fillWall).toBe('#D3D1C7');
    expect(LIGHT_TOKENS.strokeWall).toBe('#444441');
    expect(LIGHT_TOKENS.line).toBe('#5F5E5A');
    expect(LIGHT_TOKENS.text).toBe('#2C2C2A');
    expect(LIGHT_TOKENS.background).toBe('#FBFAF6');
  });

  it('DARK_TOKENS shares fills with LIGHT_TOKENS', () => {
    expect(DARK_TOKENS.fillWood).toBe(LIGHT_TOKENS.fillWood);
    expect(DARK_TOKENS.fillStruct).toBe(LIGHT_TOKENS.fillStruct);
    expect(DARK_TOKENS.fillWall).toBe(LIGHT_TOKENS.fillWall);
  });

  it('DARK_TOKENS has the documented dark stroke/text values', () => {
    expect(DARK_TOKENS.strokeWood).toBe('#D89A55');
    expect(DARK_TOKENS.strokeStruct).toBe('#9389DC');
    expect(DARK_TOKENS.strokeWall).toBe('#A8A69A');
    expect(DARK_TOKENS.line).toBe('#C4C2BD');
    expect(DARK_TOKENS.text).toBe('#ECECEA');
    expect(DARK_TOKENS.background).toBe('#2A2A28');
  });

  it('getCurrentTokens returns LIGHT_TOKENS when document is undefined', () => {
    const realDoc = globalThis.document;
    delete (globalThis as { document?: unknown }).document;
    try {
      expect(getCurrentTokens()).toBe(LIGHT_TOKENS);
    } finally {
      globalThis.document = realDoc;
    }
  });

  it('getCurrentTokens returns DARK_TOKENS when html data-theme is "dark"', () => {
    document.documentElement.dataset.theme = 'dark';
    try {
      expect(getCurrentTokens()).toBe(DARK_TOKENS);
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

  it('getCurrentTokens returns LIGHT_TOKENS for any other data-theme value', () => {
    document.documentElement.dataset.theme = 'light';
    try {
      expect(getCurrentTokens()).toBe(LIGHT_TOKENS);
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

  it('DiagramTokens type has expected keys', () => {
    const sample: DiagramTokens = LIGHT_TOKENS;
    expect(Object.keys(sample).sort()).toEqual(
      ['background', 'fillRidge', 'fillStruct', 'fillWall', 'fillWood', 'line', 'strokeRidge', 'strokeStruct', 'strokeWall', 'strokeWood', 'text'].sort(),
    );
  });

  it('ridge tokens are present with green palette', () => {
    expect(LIGHT_TOKENS.fillRidge).toBe('#B5D8A8');
    expect(LIGHT_TOKENS.strokeRidge).toBe('#406834');
    expect(DARK_TOKENS.fillRidge).toBe('#B5D8A8');
    expect(DARK_TOKENS.strokeRidge).toBe('#6E9D5C');
  });
});
