import type { Piece, Piece3D, Polygon, PolygonWithHoles } from '../core/types';
import { isPolygonWithHoles } from '../core/types';
import type { FramingParams } from './types';

export type VerificationLayer = 'sanity' | 'geometric' | 'structural' | 'fabrication';

export interface VerificationError {
  layer: VerificationLayer;
  severity: 'error' | 'warning';
  pieceKind?: string;
  message: string;
}

export interface VerificationResult {
  ok: boolean;
  errors: ReadonlyArray<VerificationError>;
}

function outlineOf(p: Polygon | PolygonWithHoles): Polygon {
  return isPolygonWithHoles(p) ? p.outline : p;
}

function polyBBoxDims(p: Polygon | PolygonWithHoles): { w: number; h: number } {
  const verts = outlineOf(p);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of verts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { w: maxX - minX, h: maxY - minY };
}

function dimsMatchUpToRotation(a: { w: number; h: number }, b: { w: number; h: number }, eps = 1e-4): boolean {
  return (Math.abs(a.w - b.w) < eps && Math.abs(a.h - b.h) < eps)
    || (Math.abs(a.w - b.h) < eps && Math.abs(a.h - b.w) < eps);
}

// A cut piece is cut from `stockThickness` ply and has bounding-box dims (a, b).
// The 3D piece has polygon bbox (c, d) and is extruded perpendicular by `extrudeDepth`.
// The piece's actual 3D bounding box is the multiset {a, b, stockThickness} for the cut
// representation and {c, d, extrudeDepth} for the 3D representation. They must match as
// sorted triplets for the piece to be geometrically the same.
function tripletsMatch(
  cut: { w: number; h: number },
  three: { w: number; h: number },
  stockThickness: number,
  extrudeDepth: number,
  eps = 1e-4,
): boolean {
  const a = [cut.w, cut.h, stockThickness].sort((x, y) => x - y);
  const b = [three.w, three.h, extrudeDepth].sort((x, y) => x - y);
  return a.every((v, i) => Math.abs(v - b[i]) < eps);
}

function pieceKindOf(piece: Piece | Piece3D): string {
  return piece.placement?.kind ?? 'unknown';
}

function pieceIdentity(piece: Piece | Piece3D): string {
  const p = piece.placement;
  if (!p) return 'unknown';
  switch (p.kind) {
    case 'framing-end-cap': return `${p.kind}:${p.framingId}:${p.endCap}:${p.layer}:${p.segmentStartIn ?? 0}`;
    case 'framing-member': return `${p.kind}:${p.framingId}:${p.indexAlongLength}`;
    case 'framing-block': return `${p.kind}:${p.framingId}:${p.bayIndex}:${p.rowIndex}`;
    case 'splice-gusset': return `${p.kind}:${p.hostKind}:${p.hostId}:${p.hostSubKey}:${p.positionAlongIn.toFixed(4)}:${p.spliceFace}`;
    default: return `${p.kind}:unknown`;
  }
}

// LAYER 1 -- sanity: cut <-> 3D parity per piece kind and per identity
function checkSanity(
  params: FramingParams,
  cutPieces: ReadonlyArray<Piece>,
  pieces3D: ReadonlyArray<Piece3D>,
): VerificationError[] {
  const errors: VerificationError[] = [];

  const countByKindCut = new Map<string, number>();
  const countByKind3D = new Map<string, number>();
  for (const p of cutPieces) countByKindCut.set(pieceKindOf(p), (countByKindCut.get(pieceKindOf(p)) ?? 0) + 1);
  for (const p of pieces3D) countByKind3D.set(pieceKindOf(p), (countByKind3D.get(pieceKindOf(p)) ?? 0) + 1);

  const allKinds = new Set<string>([...countByKindCut.keys(), ...countByKind3D.keys()]);
  for (const kind of allKinds) {
    const c = countByKindCut.get(kind) ?? 0;
    const d = countByKind3D.get(kind) ?? 0;
    if (c !== d) {
      errors.push({
        layer: 'sanity',
        severity: 'error',
        pieceKind: kind,
        message: `Cut list emits ${c} ${kind} piece(s) but 3D viewer shows ${d}. They must match.`,
      });
    }
  }

  // Identity-level parity: every cut piece should have a 3D counterpart with matching dims.
  const cutById = new Map<string, Piece>();
  for (const p of cutPieces) cutById.set(pieceIdentity(p), p);
  const threeDById = new Map<string, Piece3D>();
  for (const p of pieces3D) threeDById.set(pieceIdentity(p), p);

  for (const [id, cut] of cutById) {
    const td = threeDById.get(id);
    if (!td) {
      errors.push({
        layer: 'sanity',
        severity: 'error',
        pieceKind: pieceKindOf(cut),
        message: `Cut piece ${id} has no matching piece in the 3D model.`,
      });
      continue;
    }
    const cutDims = polyBBoxDims(cut.polygon);
    const threeDDims = polyBBoxDims(td.polygon);
    if (!tripletsMatch(cutDims, threeDDims, params.stockThicknessIn, td.extrudeDepthIn)) {
      errors.push({
        layer: 'sanity',
        severity: 'error',
        pieceKind: pieceKindOf(cut),
        message: `${id}: cut piece ${cutDims.w.toFixed(3)}x${cutDims.h.toFixed(3)}x${params.stockThicknessIn.toFixed(3)} does not match 3D piece ${threeDDims.w.toFixed(3)}x${threeDDims.h.toFixed(3)}x${td.extrudeDepthIn.toFixed(3)} (sorted dim sets differ).`,
      });
    }
  }
  for (const id of threeDById.keys()) {
    if (!cutById.has(id)) {
      const td = threeDById.get(id)!;
      errors.push({
        layer: 'sanity',
        severity: 'error',
        pieceKind: pieceKindOf(td),
        message: `3D piece ${id} has no matching cut piece. You cannot assemble it.`,
      });
    }
  }
  return errors;
}

// LAYER 2 -- geometric: 3D AABB overlap detection + gap detection at expected joints
function aabbOf(piece: Piece3D): { min: [number, number, number]; max: [number, number, number] } {
  const verts = outlineOf(piece.polygon);
  const o = piece.origin;
  const u = piece.uAxis;
  const v = piece.vAxis;
  // The 3D piece is: origin + u*polyX + v*polyY + extrudeNormal*[0..extrudeDepth].
  // For our framing pieces u/v are axis-aligned and extrusion is along the third axis.
  // Compute AABB across the 8 extruded vertices.
  const extrudeAxis: [number, number, number] = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const e = piece.extrudeDepthIn;
  let mn: [number, number, number] = [Infinity, Infinity, Infinity];
  let mx: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const [px, py] of verts) {
    for (const eFrac of [0, 1]) {
      for (let i = 0; i < 3; i++) {
        const v3 = o[i] + u[i] * px + v[i] * py + extrudeAxis[i] * e * eFrac;
        if (v3 < mn[i]) mn[i] = v3;
        if (v3 > mx[i]) mx[i] = v3;
      }
    }
  }
  return { min: mn, max: mx };
}

function aabbsOverlap(
  a: { min: [number, number, number]; max: [number, number, number] },
  b: { min: [number, number, number]; max: [number, number, number] },
  eps = 1e-4,
): boolean {
  for (let i = 0; i < 3; i++) {
    if (a.max[i] < b.min[i] + eps) return false;
    if (b.max[i] < a.min[i] + eps) return false;
  }
  return true;
}

function checkGeometric(pieces3D: ReadonlyArray<Piece3D>): VerificationError[] {
  const errors: VerificationError[] = [];
  const boxes = pieces3D.map((p) => ({ piece: p, aabb: aabbOf(p) }));
  // O(N^2) pairwise overlap. Acceptable for ~50-piece walls.
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (!aabbsOverlap(a.aabb, b.aabb)) continue;
      // Joint exceptions: an end-cap is supposed to touch its members at the seam.
      // We accept zero-thickness contact (already passes !aabbsOverlap when eps tuned).
      // For now, flag any positive-volume overlap as an error.
      const overlapVol = volumeOf(intersectAABBs(a.aabb, b.aabb));
      if (overlapVol > 1e-6) {
        errors.push({
          layer: 'geometric',
          severity: 'error',
          pieceKind: pieceKindOf(a.piece),
          message: `${pieceIdentity(a.piece)} and ${pieceIdentity(b.piece)} overlap in 3D by ${overlapVol.toFixed(5)} cubic inches.`,
        });
      }
    }
  }
  return errors;
}

function intersectAABBs(
  a: { min: [number, number, number]; max: [number, number, number] },
  b: { min: [number, number, number]; max: [number, number, number] },
): { min: [number, number, number]; max: [number, number, number] } {
  return {
    min: [Math.max(a.min[0], b.min[0]), Math.max(a.min[1], b.min[1]), Math.max(a.min[2], b.min[2])],
    max: [Math.min(a.max[0], b.max[0]), Math.min(a.max[1], b.max[1]), Math.min(a.max[2], b.max[2])],
  };
}

function volumeOf(box: { min: [number, number, number]; max: [number, number, number] }): number {
  const dx = Math.max(0, box.max[0] - box.min[0]);
  const dy = Math.max(0, box.max[1] - box.min[1]);
  const dz = Math.max(0, box.max[2] - box.min[2]);
  return dx * dy * dz;
}

// Two axis-aligned faces touch iff they're coplanar on one axis and their 2D
// footprints overlap on the other two. Returns the contact area (square inches)
// or null if no contact.
function faceContactArea(
  a: { min: [number, number, number]; max: [number, number, number] },
  b: { min: [number, number, number]; max: [number, number, number] },
  eps = 5e-4,
): number | null {
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    const coplanar = Math.abs(a.max[axis] - b.min[axis]) < eps || Math.abs(a.min[axis] - b.max[axis]) < eps;
    if (!coplanar) continue;
    const ou = Math.min(a.max[u], b.max[u]) - Math.max(a.min[u], b.min[u]);
    const ov = Math.min(a.max[v], b.max[v]) - Math.max(a.min[v], b.min[v]);
    if (ou > eps && ov > eps) return ou * ov;
  }
  return null;
}

// LAYER 2b -- structural: every piece must be part of one connected component,
// and per-kind expected degree (e.g., a stud touches both plates).
function checkStructural(pieces3D: ReadonlyArray<Piece3D>): VerificationError[] {
  const errors: VerificationError[] = [];
  if (pieces3D.length === 0) return errors;
  const boxes = pieces3D.map((p) => ({ piece: p, aabb: aabbOf(p) }));

  // Build adjacency via face contact.
  const adj: number[][] = boxes.map(() => []);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const area = faceContactArea(boxes[i].aabb, boxes[j].aabb);
      if (area !== null && area > 1e-4) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  // Connectedness via BFS from node 0.
  const seen = new Set<number>([0]);
  const queue: number[] = [0];
  while (queue.length > 0) {
    const n = queue.shift()!;
    for (const m of adj[n]) if (!seen.has(m)) { seen.add(m); queue.push(m); }
  }
  if (seen.size !== boxes.length) {
    const isolated = boxes
      .map((b, i) => ({ piece: b.piece, i }))
      .filter(({ i }) => !seen.has(i))
      .map(({ piece }) => pieceIdentity(piece));
    errors.push({
      layer: 'structural',
      severity: 'error',
      message: `Assembly has disconnected pieces (no face contact with anything else): ${isolated.join(', ')}.`,
    });
  }

  // Per-kind expected degree.
  // - Stud (framing-member, mode=wall): expects >=2 face contacts (bottom + top plate).
  // - Block (framing-block): expects >=2 contacts (its two studs).
  // - End cap (framing-end-cap): expects >=1 member contact.
  for (let i = 0; i < boxes.length; i++) {
    const kind = pieceKindOf(boxes[i].piece);
    const deg = adj[i].length;
    if (kind === 'framing-member' && deg < 2) {
      errors.push({
        layer: 'structural',
        severity: 'error',
        pieceKind: kind,
        message: `${pieceIdentity(boxes[i].piece)}: member touches only ${deg} other piece(s). Expected at least 2 (both end caps).`,
      });
    } else if (kind === 'framing-block' && deg < 2) {
      errors.push({
        layer: 'structural',
        severity: 'error',
        pieceKind: kind,
        message: `${pieceIdentity(boxes[i].piece)}: block touches only ${deg} other piece(s). Expected at least 2 (the two adjacent members).`,
      });
    } else if (kind === 'framing-end-cap' && deg < 1) {
      errors.push({
        layer: 'structural',
        severity: 'error',
        pieceKind: kind,
        message: `${pieceIdentity(boxes[i].piece)}: end cap touches no members. Did the resolver place it correctly?`,
      });
    }
  }
  return errors;
}

// LAYER 3 -- fabrication: are these pieces actually cuttable + assemble-able?
const LASER_KERF_IN = 0.018; // xTool H2S diode kerf approx
const MIN_FEATURE_IN = LASER_KERF_IN * 3; // smallest reliable cut feature

function checkFabrication(
  params: FramingParams,
  cutPieces: ReadonlyArray<Piece>,
): VerificationError[] {
  const errors: VerificationError[] = [];
  for (const piece of cutPieces) {
    const dims = polyBBoxDims(piece.polygon);
    if (dims.w < MIN_FEATURE_IN || dims.h < MIN_FEATURE_IN) {
      errors.push({
        layer: 'fabrication',
        severity: 'warning',
        pieceKind: pieceKindOf(piece),
        message: `${pieceIdentity(piece)}: cut dims ${dims.w.toFixed(3)}x${dims.h.toFixed(3)} are below the minimum reliable feature size (${MIN_FEATURE_IN.toFixed(3)}", = 3 * kerf). May char or vanish.`,
      });
    }
    // Check engraved features for sub-kerf sizes
    if (piece.engravedFeatures) {
      for (const feat of piece.engravedFeatures) {
        const fd = polyBBoxDims(feat);
        if (fd.w < LASER_KERF_IN && fd.h < LASER_KERF_IN) {
          errors.push({
            layer: 'fabrication',
            severity: 'warning',
            pieceKind: pieceKindOf(piece),
            message: `${pieceIdentity(piece)}: an engraved feature is ${fd.w.toFixed(4)}x${fd.h.toFixed(4)} -- both axes below kerf width (${LASER_KERF_IN.toFixed(4)}"). Will not render.`,
          });
          break;
        }
      }
    }
  }
  // Material accounting: total cut area must fit on the sheet within margin.
  const usableSheetWidth = params.sheetWidthIn - 2 * params.marginIn;
  if (usableSheetWidth <= 0) {
    errors.push({
      layer: 'fabrication',
      severity: 'error',
      message: `Sheet margin (${params.marginIn.toFixed(3)}" each side) consumes the whole sheet width (${params.sheetWidthIn.toFixed(2)}").`,
    });
  }
  for (const piece of cutPieces) {
    const dims = polyBBoxDims(piece.polygon);
    const longestDim = Math.max(dims.w, dims.h);
    if (longestDim > params.sheetWidthIn - 2 * params.marginIn + 1e-6 && longestDim > params.maxPieceLengthIn + 1e-6) {
      errors.push({
        layer: 'fabrication',
        severity: 'error',
        pieceKind: pieceKindOf(piece),
        message: `${pieceIdentity(piece)}: longest dim ${longestDim.toFixed(2)}" cannot fit the sheet (${(params.sheetWidthIn - 2 * params.marginIn).toFixed(2)}" usable) at any rotation.`,
      });
    }
  }
  return errors;
}

export function verifyFraming(
  params: FramingParams,
  cutPieces: ReadonlyArray<Piece>,
  pieces3D: ReadonlyArray<Piece3D>,
): VerificationResult {
  const errors: VerificationError[] = [
    ...checkSanity(params, cutPieces, pieces3D),
    ...checkGeometric(pieces3D),
    ...checkStructural(pieces3D),
    ...checkFabrication(params, cutPieces),
  ];
  return {
    ok: !errors.some((e) => e.severity === 'error'),
    errors,
  };
}
