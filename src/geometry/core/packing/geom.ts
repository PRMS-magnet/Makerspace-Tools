import type { Polygon, Vec2 } from '../types';

const EPS = 1e-9;

export function add(a: Vec2, b: Vec2): Vec2 { return [a[0] + b[0], a[1] + b[1]]; }
export function sub(a: Vec2, b: Vec2): Vec2 { return [a[0] - b[0], a[1] - b[1]]; }
export function neg(a: Vec2): Vec2 { return [-a[0], -a[1]]; }
export function cross(a: Vec2, b: Vec2): number { return a[0] * b[1] - a[1] * b[0]; }
export function dot(a: Vec2, b: Vec2): number { return a[0] * b[0] + a[1] * b[1]; }

export function rotateDeg([x, y]: Vec2, deg: number): Vec2 {
  if (deg === 0) return [x, y];
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return [x * c - y * s, x * s + y * c];
}

export function rotatePolyDeg(poly: Polygon, deg: number): Polygon {
  if (deg === 0) return poly.map((p) => [p[0], p[1]] as Vec2);
  return poly.map((p) => rotateDeg(p, deg));
}

export function translate(poly: Polygon, t: Vec2): Polygon {
  return poly.map((p) => [p[0] + t[0], p[1] + t[1]] as Vec2);
}

export function signedArea(poly: Polygon): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function ensureCCW(poly: Polygon): Polygon {
  return signedArea(poly) < 0 ? [...poly].reverse() : [...poly];
}

export function convexHull(points: Polygon): Polygon {
  if (points.length <= 1) return [...points];
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lower: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(sub(lower[lower.length - 1], lower[lower.length - 2]), sub(p, lower[lower.length - 2])) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(sub(upper[upper.length - 1], upper[upper.length - 2]), sub(p, upper[upper.length - 2])) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export function isCCW(poly: Polygon): boolean {
  return signedArea(poly) > 0;
}

export function minkowskiSumConvex(A: Polygon, B: Polygon): Polygon {
  if (A.length === 0 || B.length === 0) return [];
  const a = reorderBottomLeft(ensureCCW(A));
  const b = reorderBottomLeft(ensureCCW(B));

  const aa = [...a, a[0], a[1]];
  const bb = [...b, b[0], b[1]];
  const result: Vec2[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    result.push(add(aa[i], bb[j]));
    const c = cross(sub(aa[i + 1], aa[i]), sub(bb[j + 1], bb[j]));
    if (c >= -EPS) i++;
    if (c <= EPS) j++;
  }
  return result;
}

function reorderBottomLeft(poly: Polygon): Polygon {
  let lo = 0;
  for (let i = 1; i < poly.length; i++) {
    if (poly[i][1] < poly[lo][1] - EPS ||
        (Math.abs(poly[i][1] - poly[lo][1]) < EPS && poly[i][0] < poly[lo][0])) {
      lo = i;
    }
  }
  return [...poly.slice(lo), ...poly.slice(0, lo)];
}

export function nfpConvex(A: Polygon, B: Polygon, refOfB?: Vec2): Polygon {
  const refB = refOfB ?? reorderBottomLeft(ensureCCW(B))[0];
  const Bshifted: Polygon = B.map(([x, y]) => [x - refB[0], y - refB[1]] as Vec2);
  const negB = ensureCCW(Bshifted.map(neg));
  return minkowskiSumConvex(A, negB);
}

export interface IFPRect {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export function ifpRect(B: Polygon, xLo: number, xHi: number, yLo: number, yHi: number): IFPRect | null {
  const refB = reorderBottomLeft(ensureCCW(B));
  const ref = refB[0];
  let bxMin = Infinity, byMin = Infinity, bxMax = -Infinity, byMax = -Infinity;
  for (const p of refB) {
    const dx = p[0] - ref[0];
    const dy = p[1] - ref[1];
    if (dx < bxMin) bxMin = dx;
    if (dx > bxMax) bxMax = dx;
    if (dy < byMin) byMin = dy;
    if (dy > byMax) byMax = dy;
  }
  const xMin = xLo - bxMin;
  const xMax = xHi - bxMax;
  const yMin = yLo - byMin;
  const yMax = yHi - byMax;
  if (xMin > xMax + EPS || yMin > yMax + EPS) return null;
  return { xMin, xMax, yMin, yMax };
}

export function pointStrictlyInside(pt: Vec2, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];

    const onEdge = isPointOnSegment(pt, poly[j], poly[i], EPS);
    if (onEdge) return false;
    const intersect = ((yi > pt[1]) !== (yj > pt[1])) &&
      (pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointOnSegment(p: Vec2, a: Vec2, b: Vec2, eps = EPS): boolean {
  const d = cross(sub(b, a), sub(p, a));
  if (Math.abs(d) > eps) return false;
  const t = dot(sub(p, a), sub(b, a));
  const lenSq = dot(sub(b, a), sub(b, a));
  return t >= -eps && t <= lenSq + eps;
}

export function segmentIntersection(a: Vec2, b: Vec2, c: Vec2, d: Vec2): Vec2 | null {
  const r = sub(b, a);
  const s = sub(d, c);
  const rxs = cross(r, s);
  const qmp = sub(c, a);
  const qpxr = cross(qmp, r);
  if (Math.abs(rxs) < EPS) {
    if (Math.abs(qpxr) > EPS) return null;

    return null;
  }
  const t = cross(qmp, s) / rxs;
  const u = cross(qmp, r) / rxs;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}

export function bboxOf(poly: Polygon): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function inflateConvex(poly: Polygon, d: number): Polygon {
  if (d <= 0) return [...poly];
  const square: Polygon = [
    [-d, -d], [d, -d], [d, d], [-d, d],
  ];
  return minkowskiSumConvex(ensureCCW(poly), square);
}
