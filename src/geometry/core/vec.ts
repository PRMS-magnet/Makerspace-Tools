import type { Vec2 } from './types';

export function add(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]];
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}

export function scale(a: Vec2, k: number): Vec2 {
  return [a[0] * k, a[1] * k];
}

export function rotate(a: Vec2, theta: number): Vec2 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
}

export function eq(a: Vec2, b: Vec2, eps = 1e-9): boolean {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
}
