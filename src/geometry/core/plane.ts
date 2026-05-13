import type { Vec3 } from './vec3';
import { add3, cross3, dot3, length3, normalize3, scale3, sub3 } from './vec3';

export interface Plane {
  point: Vec3;
  normal: Vec3;
}

export interface Line3 {
  origin: Vec3;
  direction: Vec3;
}

const PARALLEL_TOL = 1e-9;

export function planeFromThreePoints(a: Vec3, b: Vec3, c: Vec3): Plane | null {
  const ab = sub3(b, a);
  const ac = sub3(c, a);
  const n = cross3(ab, ac);
  if (length3(n) < PARALLEL_TOL) return null;
  return { point: a, normal: normalize3(n) };
}

export function pointPlaneDistance(p: Vec3, plane: Plane): number {
  const n = normalize3(plane.normal);
  return dot3(sub3(p, plane.point), n);
}

export function planeIntersection(a: Plane, b: Plane): Line3 | null {
  const direction = cross3(a.normal, b.normal);
  if (length3(direction) < PARALLEL_TOL) return null;

  const n1 = normalize3(a.normal);
  const n2 = normalize3(b.normal);
  const h1 = dot3(n1, a.point);
  const h2 = dot3(n2, b.point);
  const dotNN = dot3(n1, n2);
  const denom = 1 - dotNN * dotNN;
  if (Math.abs(denom) < PARALLEL_TOL) return null;

  const c1 = (h1 - h2 * dotNN) / denom;
  const c2 = (h2 - h1 * dotNN) / denom;
  const origin: Vec3 = add3(scale3(n1, c1), scale3(n2, c2));

  return { origin, direction: normalize3(direction) };
}

export function pointOnLine(line: Line3, t: number): Vec3 {
  return add3(line.origin, scale3(line.direction, t));
}
