import * as THREE from 'three';
import type { Piece3D } from '../../geometry/core/types';

const UNIT_COLORS = [
  0x1f77b4,
  0xd62728,
  0x2ca02c,
  0xff7f0e,
  0x9467bd,
  0x8c564b,
];

export interface DebugLayer {
  group: THREE.Group;
  update: (pieces: Piece3D[]) => void;
  dispose: () => void;
  setVisible: (v: boolean) => void;
}

function unitColor(unitId: string | undefined, table: Map<string, number>): number {
  const key = unitId ?? 'unknown';
  let c = table.get(key);
  if (c === undefined) {
    c = UNIT_COLORS[table.size % UNIT_COLORS.length];
    table.set(key, c);
  }
  return c;
}

export function createDebugLayer(): DebugLayer {
  const group = new THREE.Group();
  group.name = 'debug-overlay';
  group.renderOrder = 999;

  const axesLength = 0.6;
  const arrowLength = 0.5;
  const arrowHeadLength = 0.12;
  const arrowHeadWidth = 0.07;

  const disposables: { dispose(): void }[] = [];

  function clear(): void {
    while (group.children.length) {
      const child = group.children.pop()!;
      child.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = (mesh as THREE.Mesh).material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m) (m as THREE.Material).dispose();
      });
    }
  }

  function update(pieces: Piece3D[]): void {
    clear();
    const unitColorTable = new Map<string, number>();

    const piecesByUnit = new Map<string, Piece3D[]>();
    for (const p of pieces) {
      const key = p.unitId ?? 'unknown';
      const arr = piecesByUnit.get(key) ?? [];
      arr.push(p);
      piecesByUnit.set(key, arr);
    }

    for (const [unitId, unitPieces] of piecesByUnit) {
      const color = unitColor(unitId, unitColorTable);

      const unitBox = new THREE.Box3();
      for (const p of unitPieces) {
        const u = new THREE.Vector3(...p.uAxis);
        const v = new THREE.Vector3(...p.vAxis);
        const origin = new THREE.Vector3(...p.origin);
        const outline = 'outline' in p.polygon ? p.polygon.outline : p.polygon;
        for (const [pu, pv] of outline) {
          unitBox.expandByPoint(new THREE.Vector3(
            origin.x + pu * u.x + pv * v.x,
            origin.y + pu * u.y + pv * v.y,
            origin.z + pu * u.z + pv * v.z,
          ));
        }
      }
      if (!unitBox.isEmpty()) {
        const box = new THREE.Box3Helper(unitBox, color);
        group.add(box);
      }

      for (const p of unitPieces) {
        const origin = new THREE.Vector3(...p.origin);
        const u = new THREE.Vector3(...p.uAxis).normalize();
        const v = new THREE.Vector3(...p.vAxis).normalize();

        const uArrow = new THREE.ArrowHelper(u, origin, arrowLength, 0xff3030, arrowHeadLength, arrowHeadWidth);
        const vArrow = new THREE.ArrowHelper(v, origin, arrowLength, 0x30ff30, arrowHeadLength, arrowHeadWidth);
        group.add(uArrow);
        group.add(vArrow);

        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 8, 8),
          new THREE.MeshBasicMaterial({ color }),
        );
        dot.position.copy(origin);
        group.add(dot);
      }
    }

    const world = new THREE.AxesHelper(axesLength * 2);
    group.add(world);
  }

  return {
    group,
    update,
    dispose: () => {
      clear();
      for (const d of disposables) d.dispose();
    },
    setVisible: (v: boolean) => { group.visible = v; },
  };
}

export function isDebugEnabled(): boolean {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get('debug') === '1') return true;
    if (localStorage.getItem('mt:ui:roof:debug') === '1') return true;
  } catch {}
  return false;
}
