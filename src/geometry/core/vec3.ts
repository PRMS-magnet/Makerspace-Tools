export type Vec3 = readonly [number, number, number];

export function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale3(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

export function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function length3(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

const ZERO_LEN_TOL = 1e-12;

export function normalize3(a: Vec3): Vec3 {
  const len = length3(a);
  if (len < ZERO_LEN_TOL) return [0, 0, 0];
  return [a[0] / len, a[1] / len, a[2] / len];
}

export function eq3(a: Vec3, b: Vec3, eps = 1e-9): boolean {
  return (
    Math.abs(a[0] - b[0]) < eps &&
    Math.abs(a[1] - b[1]) < eps &&
    Math.abs(a[2] - b[2]) < eps
  );
}
