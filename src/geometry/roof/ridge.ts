import type { Polygon, PolygonWithHoles, Vec2 } from '../core/types';

export interface MortiseSpec {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
}

export interface RidgePolygonInput {
  lengthIn: number;
  heightZ: number;
  mortises: readonly MortiseSpec[];
}

interface EdgeNotch {
  alongMin: number;
  alongMax: number;
  depth: number;
}

interface CornerNotch {
  width: number;
  height: number;
}

interface CornerNotches {
  tl?: CornerNotch;
  tr?: CornerNotch;
  bl?: CornerNotch;
  br?: CornerNotch;
}

export function buildRidgePolygon(input: RidgePolygonInput): PolygonWithHoles {
  const EPS = 1e-6;
  const L = input.lengthIn;
  const H = input.heightZ;
  const leftN: EdgeNotch[] = [];
  const rightN: EdgeNotch[] = [];
  const topN: EdgeNotch[] = [];
  const botN: EdgeNotch[] = [];
  const corners: CornerNotches = {};
  const interiorHoles: Polygon[] = [];

  for (const m of input.mortises) {
    const leftX = m.cx - m.halfW;
    const rightX = m.cx + m.halfW;
    const botY = m.cy - m.halfH;
    const topY = m.cy + m.halfH;
    const tL = leftX < EPS;
    const tR = rightX > L - EPS;
    const tB = botY < EPS;
    const tT = topY > H - EPS;
    const touchCount = +tL + +tR + +tB + +tT;

    if (touchCount >= 3) {
      throw new Error(
        `Mortise at (${m.cx}, ${m.cy}) touches 3+ ridge edges; ridge is too small for the joint`,
      );
    }
    if (tL && tT) {
      corners.tl = { width: rightX, height: H - botY };
    } else if (tR && tT) {
      corners.tr = { width: L - leftX, height: H - botY };
    } else if (tL && tB) {
      corners.bl = { width: rightX, height: topY };
    } else if (tR && tB) {
      corners.br = { width: L - leftX, height: topY };
    } else if (tL) {
      leftN.push({ alongMin: botY, alongMax: topY, depth: rightX });
    } else if (tR) {
      rightN.push({ alongMin: botY, alongMax: topY, depth: L - leftX });
    } else if (tB) {
      botN.push({ alongMin: leftX, alongMax: rightX, depth: topY });
    } else if (tT) {
      topN.push({ alongMin: leftX, alongMax: rightX, depth: H - botY });
    } else {
      interiorHoles.push([
        [leftX, botY], [rightX, botY], [rightX, topY], [leftX, topY],
      ]);
    }
  }

  return { outline: buildOutline(L, H, leftN, rightN, topN, botN, corners), holes: interiorHoles };
}

function buildOutline(
  L: number,
  H: number,
  leftN: readonly EdgeNotch[],
  rightN: readonly EdgeNotch[],
  topN: readonly EdgeNotch[],
  botN: readonly EdgeNotch[],
  c: CornerNotches,
): Polygon {
  const blW = c.bl?.width ?? 0;
  const blH = c.bl?.height ?? 0;
  const brW = c.br?.width ?? 0;
  const brH = c.br?.height ?? 0;
  const trW = c.tr?.width ?? 0;
  const trH = c.tr?.height ?? 0;
  const tlW = c.tl?.width ?? 0;
  const tlH = c.tl?.height ?? 0;

  const pts: Vec2[] = [];
  pts.push([blW, 0]);

  for (const n of [...botN].sort((a, b) => a.alongMin - b.alongMin)) {
    pts.push([n.alongMin, 0]);
    pts.push([n.alongMin, n.depth]);
    pts.push([n.alongMax, n.depth]);
    pts.push([n.alongMax, 0]);
  }
  if (c.br) {
    pts.push([L - brW, 0]);
    pts.push([L - brW, brH]);
    pts.push([L, brH]);
  } else {
    pts.push([L, 0]);
  }

  for (const n of [...rightN].sort((a, b) => a.alongMin - b.alongMin)) {
    pts.push([L, n.alongMin]);
    pts.push([L - n.depth, n.alongMin]);
    pts.push([L - n.depth, n.alongMax]);
    pts.push([L, n.alongMax]);
  }
  if (c.tr) {
    pts.push([L, H - trH]);
    pts.push([L - trW, H - trH]);
    pts.push([L - trW, H]);
  } else {
    pts.push([L, H]);
  }

  for (const n of [...topN].sort((a, b) => b.alongMax - a.alongMax)) {
    pts.push([n.alongMax, H]);
    pts.push([n.alongMax, H - n.depth]);
    pts.push([n.alongMin, H - n.depth]);
    pts.push([n.alongMin, H]);
  }
  if (c.tl) {
    pts.push([tlW, H]);
    pts.push([tlW, H - tlH]);
    pts.push([0, H - tlH]);
  } else {
    pts.push([0, H]);
  }

  for (const n of [...leftN].sort((a, b) => b.alongMax - a.alongMax)) {
    pts.push([0, n.alongMax]);
    pts.push([n.depth, n.alongMax]);
    pts.push([n.depth, n.alongMin]);
    pts.push([0, n.alongMin]);
  }
  if (c.bl) {
    pts.push([0, blH]);
    pts.push([blW, blH]);
  }

  return pts;
}
