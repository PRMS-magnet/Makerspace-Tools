import type { Vec2, Polygon } from './types';

export interface TransformOpts {
  translate?: Vec2;
  rotate?: number;
  scale?: number | Vec2;
}

export function transformPoint(p: Vec2, opts: TransformOpts): Vec2 {
  let x = p[0];
  let y = p[1];

  if (opts.scale !== undefined) {
    if (typeof opts.scale === 'number') {
      x *= opts.scale;
      y *= opts.scale;
    } else {
      x *= opts.scale[0];
      y *= opts.scale[1];
    }
  }

  if (opts.rotate !== undefined && opts.rotate !== 0) {
    const c = Math.cos(opts.rotate);
    const s = Math.sin(opts.rotate);
    const nx = x * c - y * s;
    const ny = x * s + y * c;
    x = nx;
    y = ny;
  }

  if (opts.translate) {
    x += opts.translate[0];
    y += opts.translate[1];
  }

  return [x, y];
}

export function transformPolygon(p: Polygon, opts: TransformOpts): Polygon {
  return p.map((pt) => transformPoint(pt, opts));
}
