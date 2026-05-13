import type { RoofUnit } from '../../roof/types';
import type { CrossGableTPlacement, ComputeIntersectionResult } from '../types';
import type { Line3 } from '../../core/plane';
import type { Vec3 } from '../../core/vec3';
import {
  pitchTangent,
  wingRidgeEndpointY,
  wingRidgeLengthIn,
  isJackRafterY,
} from './common';

export interface CrossGableTOptions {
  stockThicknessIn: number;
  kerfPerSideIn: number;
  fitMode: 'press' | 'slip';
}

export function computeCrossGableT(
  host: RoofUnit,
  guest: RoofUnit,
  placement: CrossGableTPlacement,
  _opts: CrossGableTOptions,
): ComputeIntersectionResult {
  const Y_main = host.spanIn;
  const S_wing = guest.spanIn;
  const L_wing = guest.houseLengthIn;
  const m_main = pitchTangent(host);
  const m_wing = pitchTangent(guest);
  const xCenter = placement.xAlongHostRidge;
  const H_wing = (m_wing * S_wing) / 2;

  const eastStart: Vec3 = [xCenter + S_wing / 2, Y_main, 0];
  const eastDir: Vec3 = [-1, -m_wing / m_main, m_wing];
  const westStart: Vec3 = [xCenter - S_wing / 2, Y_main, 0];
  const westDir: Vec3 = [+1, -m_wing / m_main, m_wing];

  const valleyLines: Line3[] = [
    { origin: eastStart, direction: eastDir },
    { origin: westStart, direction: westDir },
  ];

  const yEnd = wingRidgeEndpointY({ Y_main, S_wing, m_main, m_wing });
  const wingRidgeEndpoint: Vec3 = [xCenter, yEnd, H_wing];
  const wingRidgeLen = wingRidgeLengthIn({ L_wing, S_wing, m_main, m_wing });

  const spacing = guest.rafterSpacingIn;
  let jackYCount = 0;
  for (let y = yEnd; y <= Y_main; y += spacing) {
    if (isJackRafterY({ yJack: y, Y_main, S_wing, m_main, m_wing })) jackYCount += 1;
  }
  const jackCount = jackYCount * 2;

  const trimmerExtraCount = 2;

  return {
    newPieces: [],
    new3D: [],
    guestPiecesToReplace: ['gable-end-near'],
    hostPiecesToAdd: [],
    host3DToAdd: [],
    trimmerXPositions: [xCenter - S_wing / 2, xCenter + S_wing / 2],
    derived: {
      valleyLines,
      wingRidgeEndpoint,
      wingRidgeLengthIn: wingRidgeLen,
      jackCount,
      trimmerExtraCount,
    },
  };
}
