import * as THREE from 'three';
import type { Piece3D, Polygon, PolygonWithHoles } from '../../geometry/core/types';
import { isPolygonWithHoles } from '../../geometry/core/types';
import type { DiagramTokens } from '../diagram-tokens';

export interface MaterialSet {
  fill: Record<string, THREE.MeshBasicMaterial>;
  edge: Record<string, THREE.LineBasicMaterial>;
}

interface CachedGeometry {
  extrude: THREE.ExtrudeGeometry;
  edges: THREE.BufferGeometry;
}

export type GeometryCache = Map<Polygon | PolygonWithHoles, Map<number, CachedGeometry>>;

export function createGeometryCache(): GeometryCache {
  return new Map();
}

export function disposeGeometryCache(cache: GeometryCache): void {
  for (const byDepth of cache.values()) {
    for (const { extrude, edges } of byDepth.values()) {
      extrude.dispose();
      edges.dispose();
    }
  }
  cache.clear();
}

function getCachedGeometry(cache: GeometryCache, piece: Piece3D): CachedGeometry {
  let byDepth = cache.get(piece.polygon);
  if (!byDepth) { byDepth = new Map(); cache.set(piece.polygon, byDepth); }
  let entry = byDepth.get(piece.extrudeDepthIn);
  if (entry) return entry;

  const outline = isPolygonWithHoles(piece.polygon) ? piece.polygon.outline : piece.polygon;
  const shape = new THREE.Shape();
  outline.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();

  if (isPolygonWithHoles(piece.polygon)) {
    for (const hole of piece.polygon.holes) {
      const h = new THREE.Path();
      hole.forEach(([x, y], i) => (i === 0 ? h.moveTo(x, y) : h.lineTo(x, y)));
      h.closePath();
      shape.holes.push(h);
    }
  }

  const extrude = new THREE.ExtrudeGeometry(shape, { depth: piece.extrudeDepthIn, bevelEnabled: false });
  const edges = new THREE.EdgesGeometry(extrude, 20);
  entry = { extrude, edges };
  byDepth.set(piece.extrudeDepthIn, entry);
  return entry;
}

export function evictGeometryCache(
  cache: GeometryCache,
  livePolys: Set<Polygon | PolygonWithHoles>,
): void {
  for (const poly of [...cache.keys()]) {
    if (livePolys.has(poly)) continue;
    const byDepth = cache.get(poly)!;
    for (const { extrude, edges } of byDepth.values()) {
      extrude.dispose();
      edges.dispose();
    }
    cache.delete(poly);
  }
}

export function buildMaterialSet(tokens: DiagramTokens): MaterialSet {

  const fill: Record<string, THREE.MeshBasicMaterial> = {
    rafter: new THREE.MeshBasicMaterial({ color: tokens.fillWood }),
    ridge: new THREE.MeshBasicMaterial({ color: tokens.fillRidge }),
    joist: new THREE.MeshBasicMaterial({ color: tokens.fillStruct }),
    'collar tie': new THREE.MeshBasicMaterial({ color: tokens.fillStruct }),
    wall: new THREE.MeshBasicMaterial({ color: tokens.fillWall }),
    default: new THREE.MeshBasicMaterial({ color: tokens.fillWall }),
  };
  const edge: Record<string, THREE.LineBasicMaterial> = {
    rafter: new THREE.LineBasicMaterial({ color: tokens.strokeWood }),
    ridge: new THREE.LineBasicMaterial({ color: tokens.strokeRidge }),
    joist: new THREE.LineBasicMaterial({ color: tokens.strokeStruct }),
    'collar tie': new THREE.LineBasicMaterial({ color: tokens.strokeStruct }),
    wall: new THREE.LineBasicMaterial({ color: tokens.strokeWall }),
    default: new THREE.LineBasicMaterial({ color: tokens.strokeWall }),
  };
  return { fill, edge };
}

export function applyEdgeColors(materials: MaterialSet, tokens: DiagramTokens): void {
  materials.edge.rafter.color.set(tokens.strokeWood);
  materials.edge.ridge.color.set(tokens.strokeRidge);
  materials.edge.joist.color.set(tokens.strokeStruct);
  materials.edge['collar tie'].color.set(tokens.strokeStruct);
  materials.edge.wall.color.set(tokens.strokeWall);
  materials.edge.default.color.set(tokens.strokeWall);
}

export function disposeMaterialSet(m: MaterialSet): void {
  for (const v of Object.values(m.fill)) v.dispose();
  for (const v of Object.values(m.edge)) v.dispose();
}

export function buildPieceObject(piece: Piece3D, materials: MaterialSet, cache: GeometryCache): THREE.Object3D {
  const { extrude, edges } = getCachedGeometry(cache, piece);

  const label = piece.label ?? 'default';
  const fillMat = materials.fill[label] ?? materials.fill.default;
  const edgeMat = materials.edge[label] ?? materials.edge.default;

  const mesh = new THREE.Mesh(extrude, fillMat);
  const lines = new THREE.LineSegments(edges, edgeMat);
  mesh.add(lines);

  const u = new THREE.Vector3(...piece.uAxis).normalize();
  const v = new THREE.Vector3(...piece.vAxis).normalize();
  const w = new THREE.Vector3().crossVectors(u, v).normalize();
  const basis = new THREE.Matrix4().makeBasis(u, v, w);
  mesh.quaternion.setFromRotationMatrix(basis);
  mesh.position.set(piece.origin[0], piece.origin[1], piece.origin[2]);

  return mesh;
}

export function disposePieceObject(_obj: THREE.Object3D): void {

}
