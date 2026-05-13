import type { Building } from './types';
import type { Vec3 } from '../core/vec3';

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

  const Lw = guest.houseLengthIn;
  const Ww = guest.spanIn;
  const Lh = host.houseLengthIn;
  const Yh = host.spanIn;

  if (inter.kind === 'cross-gable-T') {
    const xCenter = (inter.placement as { xAlongHostRidge: number }).xAlongHostRidge;
    return {
      translation: [xCenter, Yh + Lw / 2, 0],
      rotationZRadians: Math.PI / 2,
    };
  }
  if (inter.kind === 'cross-gable-L') {
    const corner = (inter.placement as { hostCorner: 'NW' | 'NE' | 'SW' | 'SE' }).hostCorner;
    switch (corner) {
      case 'NW': return { translation: [Ww / 2, Yh + Lw / 2, 0], rotationZRadians: Math.PI / 2 };
      case 'NE': return { translation: [Lh - Ww / 2, Yh + Lw / 2, 0], rotationZRadians: Math.PI / 2 };
      case 'SW': return { translation: [Ww / 2, -Lw / 2, 0], rotationZRadians: -Math.PI / 2 };
      case 'SE': return { translation: [Lh - Ww / 2, -Lw / 2, 0], rotationZRadians: -Math.PI / 2 };
    }
  }
  return { translation: [0, 0, 0], rotationZRadians: 0 };
}
