import { describe, it, expect } from 'vitest';
import type { Polygon, PolygonWithHoles } from './types';
import { isPolygonWithHoles } from './types';
import { pathFromPolygon, svgRect, svgDocument } from './svg';

describe('pathFromPolygon', () => {
  it('emits M ... L ... Z path data', () => {
    const p: Polygon = [[0, 0], [1, 0], [1, 1]];
    expect(pathFromPolygon(p)).toBe('M 0.0000,0.0000 L 1.0000,0.0000 L 1.0000,1.0000 Z');
  });

  it('applies offset', () => {
    const p: Polygon = [[0, 0], [1, 0]];
    expect(pathFromPolygon(p, [10, 20])).toBe('M 10.0000,20.0000 L 11.0000,20.0000 Z');
  });

  it('truncates to 4 decimal places', () => {
    const p: Polygon = [[0.123456789, 0]];
    expect(pathFromPolygon(p)).toBe('M 0.1235,0.0000 Z');
  });
});

describe('svgRect', () => {
  it('emits a closed rectangle path', () => {
    expect(svgRect(0, 0, 2, 3)).toBe('M0.0000,0.0000 L2.0000,0.0000 L2.0000,3.0000 L0.0000,3.0000 Z');
  });

  it('handles non-zero origin', () => {
    expect(svgRect(5, 5, 1, 1)).toBe('M5.0000,5.0000 L6.0000,5.0000 L6.0000,6.0000 L5.0000,6.0000 Z');
  });
});

describe('svgDocument', () => {
  it('wraps body in an SVG with inch units and viewBox', () => {
    const out = svgDocument({ widthIn: 12, heightIn: 8, body: '<path d="M0,0"/>' });
    expect(out).toContain('width="12in"');
    expect(out).toContain('height="8.000in"');
    expect(out).toContain('viewBox="0 0 12 8.000"');
    expect(out).toContain('<path d="M0,0"/>');
  });

  it('defaults to cut color and 0.01 stroke', () => {
    const out = svgDocument({ widthIn: 12, heightIn: 8, body: '' });
    expect(out).toContain('stroke="#cc0000"');
    expect(out).toContain('stroke-width="0.01"');
  });

  it('respects op for stroke color', () => {
    const score = svgDocument({ widthIn: 12, heightIn: 8, body: '', op: 'score' });
    expect(score).toContain('stroke="#0000cc"');
    const engrave = svgDocument({ widthIn: 12, heightIn: 8, body: '', op: 'engrave' });
    expect(engrave).toContain('stroke="#000000"');
  });

  it('escapes title content', () => {
    const out = svgDocument({ widthIn: 12, heightIn: 8, body: '', title: 'Hello & <world>' });
    expect(out).toContain('<title>Hello &amp; &lt;world&gt;</title>');
  });

  it('begins with XML declaration', () => {
    const out = svgDocument({ widthIn: 12, heightIn: 8, body: '' });
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('emits fill-rule="evenodd" so inner subpaths render as holes', () => {
    const out = svgDocument({ widthIn: 10, heightIn: 10, body: '' });
    expect(out).toContain('fill-rule="evenodd"');
  });
});

describe('pathFromPolygon — PolygonWithHoles', () => {
  it('emits the outline subpath first', () => {
    const p: PolygonWithHoles = {
      outline: [[0, 0], [10, 0], [10, 10], [0, 10]],
      holes: [],
    };
    expect(pathFromPolygon(p)).toContain('M 0.0000,0.0000 L 10.0000,0.0000');
  });

  it('emits one subpath per hole, separated by spaces', () => {
    const p: PolygonWithHoles = {
      outline: [[0, 0], [10, 0], [10, 10], [0, 10]],
      holes: [
        [[2, 2], [4, 2], [4, 4], [2, 4]],
        [[6, 6], [8, 6], [8, 8], [6, 8]],
      ],
    };
    const path = pathFromPolygon(p);
    expect(path).toContain('M 2.0000,2.0000');
    expect(path).toContain('M 6.0000,6.0000');
    expect(path.match(/M /g)?.length).toBe(3);
  });

  it('applies offset to outline and all holes', () => {
    const p: PolygonWithHoles = {
      outline: [[0, 0], [10, 0]],
      holes: [[[2, 2], [4, 2]]],
    };
    const path = pathFromPolygon(p, [100, 200]);
    expect(path).toContain('M 100.0000,200.0000');
    expect(path).toContain('M 102.0000,202.0000');
  });
});

describe('isPolygonWithHoles', () => {
  it('returns true for objects with outline and holes', () => {
    const p: PolygonWithHoles = { outline: [[0, 0]], holes: [] };
    expect(isPolygonWithHoles(p)).toBe(true);
  });
  it('returns false for plain Polygon (arrays)', () => {
    expect(isPolygonWithHoles([[0, 0], [1, 0]])).toBe(false);
  });
});
