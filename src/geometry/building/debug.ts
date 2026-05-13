import type { Piece3D, Polygon, PolygonWithHoles } from '../core/types';
import { isPolygonWithHoles } from '../core/types';
import type { Vec3 } from '../core/vec3';

export interface Bbox3 {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
  width: number; depth: number; height: number;
}

const EMPTY_BBOX: Bbox3 = {
  minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0,
  width: 0, depth: 0, height: 0,
};

function outlineOf(p: Polygon | PolygonWithHoles): Polygon {
  return isPolygonWithHoles(p) ? p.outline : p;
}

export function piece3DWorldCorners(p: Piece3D): Vec3[] {
  const outline = outlineOf(p.polygon);
  const [ox, oy, oz] = p.origin;
  const [ux, uy, uz] = p.uAxis;
  const [vx, vy, vz] = p.vAxis;
  return outline.map(([u, v]): Vec3 => [
    ox + u * ux + v * vx,
    oy + u * uy + v * vy,
    oz + u * uz + v * vz,
  ]);
}

export function bboxOfPieces3D(pieces: readonly Piece3D[]): Bbox3 {
  if (pieces.length === 0) return EMPTY_BBOX;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const piece of pieces) {
    for (const [x, y, z] of piece3DWorldCorners(piece)) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
  }
  return {
    minX, minY, minZ, maxX, maxY, maxZ,
    width: maxX - minX, depth: maxY - minY, height: maxZ - minZ,
  };
}

export function piecesFromUnit(pieces: readonly Piece3D[], unitId: string): Piece3D[] {
  return pieces.filter((p) => p.unitId === unitId);
}

export function piecesByLabel(pieces: readonly Piece3D[], label: string): Piece3D[] {
  return pieces.filter((p) => p.label === label);
}

export type ProjectionPlane = 'xy' | 'xz' | 'yz';

function project(plane: ProjectionPlane, v: Vec3): readonly [number, number] {
  switch (plane) {
    case 'xy': return [v[0], v[1]];
    case 'xz': return [v[0], v[2]];
    case 'yz': return [v[1], v[2]];
  }
}

const UNIT_COLORS = [
  '#1f77b4',
  '#d62728',
  '#2ca02c',
  '#ff7f0e',
  '#9467bd',
  '#8c564b',
];

const LABEL_OPACITY: Record<string, number> = {
  ridge: 0.95,
  rafter: 0.55,
  joist: 0.4,
  'collar tie': 0.4,
  'top plate': 0.7,
  'trimmer-extra': 0.65,
};

export interface DebugSvgOptions {
  plane?: ProjectionPlane;
  marginIn?: number;
  showLabels?: boolean;
  showGrid?: boolean;
  unitColors?: Record<string, string>;
  pxPerIn?: number;
}

function fmt(n: number): string {
  return n.toFixed(4);
}

export function buildDebugSvg(pieces: readonly Piece3D[], opts: DebugSvgOptions = {}): string {
  const plane: ProjectionPlane = opts.plane ?? 'xy';
  const margin = opts.marginIn ?? 1;
  const showLabels = opts.showLabels ?? true;
  const showGrid = opts.showGrid ?? true;
  const pxPerIn = opts.pxPerIn ?? 32;

  const unitIds = Array.from(new Set(pieces.map((p) => p.unitId ?? 'unknown')));
  const unitColor: Record<string, string> = {};
  unitIds.forEach((id, i) => {
    unitColor[id] = opts.unitColors?.[id] ?? UNIT_COLORS[i % UNIT_COLORS.length];
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const projected: Array<{ piece: Piece3D; corners: ReadonlyArray<readonly [number, number]> }> = [];
  for (const piece of pieces) {
    const corners = piece3DWorldCorners(piece).map((v) => project(plane, v));
    for (const [u, w] of corners) {
      if (u < minX) minX = u;
      if (w < minY) minY = w;
      if (u > maxX) maxX = u;
      if (w > maxY) maxY = w;
    }
    projected.push({ piece, corners });
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1; maxY = 1; }

  minX -= margin; minY -= margin; maxX += margin; maxY += margin;
  const widthIn = maxX - minX;
  const heightIn = maxY - minY;

  const flipY = (y: number) => maxY - (y - minY);
  const tx = (x: number) => fmt(x - minX);
  const ty = (y: number) => fmt(flipY(y) - minY);

  const parts: string[] = [];

  if (showGrid) {
    const step = 1;
    for (let g = Math.ceil(minX / step) * step; g <= maxX; g += step) {
      parts.push(`<line x1="${tx(g)}" y1="0" x2="${tx(g)}" y2="${fmt(heightIn)}" stroke="#eee" stroke-width="0.01"/>`);
    }
    for (let g = Math.ceil(minY / step) * step; g <= maxY; g += step) {
      parts.push(`<line x1="0" y1="${ty(g)}" x2="${fmt(widthIn)}" y2="${ty(g)}" stroke="#eee" stroke-width="0.01"/>`);
    }
  }

  for (const { piece, corners } of projected) {
    const fill = unitColor[piece.unitId ?? 'unknown'];
    const op = LABEL_OPACITY[piece.label ?? ''] ?? 0.45;
    const d = corners.map(([u, w], i) => `${i === 0 ? 'M' : 'L'} ${tx(u)},${ty(w)}`).join(' ') + ' Z';
    parts.push(
      `<path d="${d}" fill="${fill}" fill-opacity="${op.toFixed(2)}" stroke="${fill}" stroke-width="0.015" stroke-opacity="0.9"/>`,
    );
  }

  if (showLabels) {
    const labels = new Map<string, { unitId: string; cx: number; cy: number }>();
    for (const { piece, corners } of projected) {
      const key = `${piece.unitId ?? 'unknown'}:${piece.label ?? 'unlabeled'}`;
      if (labels.has(key)) continue;
      const cx = corners.reduce((s, c) => s + c[0], 0) / corners.length;
      const cy = corners.reduce((s, c) => s + c[1], 0) / corners.length;
      labels.set(key, { unitId: piece.unitId ?? 'unknown', cx, cy });
    }
    for (const [key, { unitId, cx, cy }] of labels) {
      const text = key.split(':')[1] ?? '';
      parts.push(
        `<text x="${tx(cx)}" y="${ty(cy)}" font-size="0.12" fill="${unitColor[unitId]}" text-anchor="middle" dominant-baseline="middle" style="font-family: monospace;">${text}</text>`,
      );
    }
  }

  const legend: string[] = [];
  unitIds.forEach((id, i) => {
    const y = 0.2 + i * 0.25;
    legend.push(
      `<rect x="0.2" y="${fmt(y - 0.08)}" width="0.16" height="0.16" fill="${unitColor[id]}" fill-opacity="0.6" stroke="${unitColor[id]}" stroke-width="0.01"/>`,
      `<text x="0.42" y="${fmt(y)}" font-size="0.15" fill="${unitColor[id]}" dominant-baseline="middle" style="font-family: monospace;">${id}</text>`,
    );
  });
  parts.push(...legend);

  const titleText = `plane=${plane} pieces=${pieces.length}`;
  parts.push(
    `<text x="${fmt(widthIn / 2)}" y="${fmt(heightIn - 0.15)}" font-size="0.18" fill="#444" text-anchor="middle" style="font-family: monospace;">${titleText}</text>`,
  );

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(widthIn * pxPerIn)}" height="${fmt(heightIn * pxPerIn)}" ` +
    `viewBox="0 0 ${fmt(widthIn)} ${fmt(heightIn)}" style="background:#fafafa;">\n` +
    parts.map((p) => '  ' + p).join('\n') +
    `\n</svg>\n`
  );
}

export function buildDebugTripaneSvg(pieces: readonly Piece3D[]): string {
  const top = buildDebugSvg(pieces, { plane: 'xy', showLabels: false });
  const front = buildDebugSvg(pieces, { plane: 'xz', showLabels: false });
  const side = buildDebugSvg(pieces, { plane: 'yz', showLabels: false });
  return [
    '<div style="display:flex;flex-direction:column;gap:8px;font-family:monospace;font-size:12px;">',
    '<div><strong>Top (XY)</strong></div>',
    top,
    '<div><strong>Front (XZ)</strong></div>',
    front,
    '<div><strong>Side (YZ)</strong></div>',
    side,
    '</div>',
  ].join('\n');
}
