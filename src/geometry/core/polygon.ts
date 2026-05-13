import type { Vec2, Polygon, BBox } from './types';

export function translate(p: Polygon, v: Vec2): Polygon {
  return p.map((pt): Vec2 => [pt[0] + v[0], pt[1] + v[1]]);
}

export function mirror(p: Polygon, axisX: number): Polygon {
  return p.map((pt): Vec2 => [2 * axisX - pt[0], pt[1]]);
}

export function bbox(p: Polygon): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of p) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function installedToFlat(p: Polygon): Polygon {
  const flipped: Polygon = p.map((pt): Vec2 => [pt[0], -pt[1]]);
  const b = bbox(flipped);
  return flipped.map((pt): Vec2 => [pt[0] - b.minX, pt[1] - b.minY]);
}
