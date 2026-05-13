import type { RoofUnit } from '../../roof/types';
import type { CrossGableLPlacement, ComputeIntersectionResult } from '../types';
import type { Piece, Piece3D } from '../../core/types';
import type { Line3 } from '../../core/plane';
import type { Vec3 } from '../../core/vec3';
import {
  pitchTangent,
  wingRidgeEndpointY,
  wingRidgeLengthIn,
  isJackRafterY,
} from './common';

export interface CrossGableLOptions {
  stockThicknessIn: number;
  kerfPerSideIn: number;
  fitMode: 'press' | 'slip';
}

function cornerSigns(corner: 'NW' | 'NE' | 'SW' | 'SE'): { xSign: 1 | -1; ySign: 1 | -1 } {
  switch (corner) {
    case 'NW': return { xSign: -1, ySign: +1 };
    case 'NE': return { xSign: +1, ySign: +1 };
    case 'SW': return { xSign: -1, ySign: -1 };
    case 'SE': return { xSign: +1, ySign: -1 };
  }
}

function innerCorner(
  host: RoofUnit,
  guest: RoofUnit,
  corner: 'NW' | 'NE' | 'SW' | 'SE',
): { x: number; y: number } {
  const W_wing = guest.spanIn;
  switch (corner) {
    case 'NW': return { x: W_wing, y: host.spanIn };
    case 'NE': return { x: host.houseLengthIn - W_wing, y: host.spanIn };
    case 'SW': return { x: W_wing, y: 0 };
    case 'SE': return { x: host.houseLengthIn - W_wing, y: 0 };
  }
}

export function computeCrossGableL(
  host: RoofUnit,
  guest: RoofUnit,
  placement: CrossGableLPlacement,
  _opts: CrossGableLOptions,
): ComputeIntersectionResult {
  const Y_main = host.spanIn;
  const W_wing = guest.spanIn;
  const L_wing = guest.houseLengthIn;
  const m_main = pitchTangent(host);
  const m_wing = pitchTangent(guest);
  const H_wing = (m_wing * W_wing) / 2;

  const { xSign, ySign } = cornerSigns(placement.hostCorner);
  const corner = innerCorner(host, guest, placement.hostCorner);

  const valleyStart: Vec3 = [corner.x, corner.y, 0];
  const valleyDir: Vec3 = [-xSign, -ySign * (m_wing / m_main), m_wing];

  const yEnd = wingRidgeEndpointY({ Y_main, S_wing: W_wing, m_main, m_wing });
  const endX = corner.x + xSign * (W_wing / 2);
  const endY = ySign === +1 ? yEnd : Y_main - yEnd;
  const wingRidgeEndpoint: Vec3 = [endX, endY, H_wing];
  const wingRidgeLen = wingRidgeLengthIn({ L_wing, S_wing: W_wing, m_main, m_wing });

  const spacing = guest.rafterSpacingIn;
  let jackCount = 0;
  for (let y = yEnd; y <= Y_main; y += spacing) {
    if (isJackRafterY({ yJack: y, Y_main, S_wing: W_wing, m_main, m_wing })) jackCount += 1;
  }

  const hostPiecesToAdd: Piece[] = [{
    polygon: [],
    op: 'cut',
    label: 'trimmer-extra-l-0',
  }];
  const host3DToAdd: Piece3D[] = [];

  return {
    newPieces: [],
    new3D: [],
    guestPiecesToReplace: ['gable-end-near'],
    hostPiecesToAdd,
    host3DToAdd,
    derived: {
      valleyLines: [{ origin: valleyStart, direction: valleyDir }],
      wingRidgeEndpoint,
      wingRidgeLengthIn: wingRidgeLen,
      jackCount,
      trimmerExtraCount: 1,
    },
  };
}
