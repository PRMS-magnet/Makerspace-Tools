import type { Polygon } from '../core/types';

export function rectanglePolygon(width: number, height: number): Polygon {
  return [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
}
