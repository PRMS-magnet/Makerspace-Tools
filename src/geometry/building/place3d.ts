import type { Building } from './types';
import type { Vec3 } from '../core/vec3';
import type { Piece3D } from '../core/types';

export interface UnitPlacement {
  translation: Vec3;
  rotationZRadians: number;
}

export function unitPlacement(b: Building, unitIndex: number): UnitPlacement {
  if (unitIndex === 0) return { translation: [0, 0, 0], rotationZRadians: 0 };
  const inter = b.intersections[0];
  if (!inter) return { translation: [0, 0, 0], rotationZRadians: 0 };

  const host = b.units[0];
  const guest = b.units[1];

  if (inter.kind === 'cross-gable-T') {
    const xCenter = (inter.placement as { xAlongHostRidge: number }).xAlongHostRidge;
    return {
      translation: [xCenter, host.spanIn, 0],
      rotationZRadians: Math.PI / 2,
    };
  }
  if (inter.kind === 'cross-gable-L') {
    const corner = (inter.placement as { hostCorner: 'NW' | 'NE' | 'SW' | 'SE' }).hostCorner;
    switch (corner) {
      case 'NW': return { translation: [0, host.spanIn, 0], rotationZRadians: Math.PI / 2 };
      case 'NE': return { translation: [host.houseLengthIn - guest.spanIn, host.spanIn, 0], rotationZRadians: Math.PI / 2 };
      case 'SW': return { translation: [0, 0, 0], rotationZRadians: -Math.PI / 2 };
      case 'SE': return { translation: [host.houseLengthIn - guest.spanIn, 0, 0], rotationZRadians: -Math.PI / 2 };
    }
  }
  return { translation: [0, 0, 0], rotationZRadians: 0 };
}

function rotateZ(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function applyPlacementToPiece3D(p: Piece3D, placement: UnitPlacement): Piece3D {
  if (placement.rotationZRadians === 0 &&
      placement.translation[0] === 0 &&
      placement.translation[1] === 0 &&
      placement.translation[2] === 0) {
    return p;
  }
  const a = placement.rotationZRadians;
  return {
    ...p,
    origin: add3(rotateZ(p.origin as Vec3, a), placement.translation),
    uAxis: rotateZ(p.uAxis as Vec3, a),
    vAxis: rotateZ(p.vAxis as Vec3, a),
  };
}
