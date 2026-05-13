import type { Vec2, Polygon } from '../core/types';
import { installedToFlat } from '../core/polygon';
import type { RoofParams, RoofGeometry } from './types';

export interface RafterTabOpts {
  tabLengthIn: number;
  tabHeightIn: number;
}

export function rafterInstalled(
  g: RoofGeometry,
  p: RoofParams,
  mirror: boolean,
  tabOpts?: RafterTabOpts | null,
): Polygon {
  const { tanT, cosT, R } = g;
  const d = p.rafterDepthIn;
  const yBot = (x: number) => tanT * (x - p.wallThicknessIn);
  const yTop = (x: number) => yBot(x) + d / cosT;

  const yT = yTop(R);
  const yB = yBot(R);
  const A: Vec2 = [R, yT];
  const G_: Vec2 = [-p.overhangRunIn, yTop(-p.overhangRunIn)];
  const F: Vec2 = [-p.overhangRunIn, yBot(-p.overhangRunIn)];
  const E: Vec2 = [0, yBot(0)];
  const D: Vec2 = [0, 0];
  const C: Vec2 = [p.wallThicknessIn, 0];
  const B: Vec2 = [R, yB];

  let pts: Polygon;
  if (tabOpts === null) {
    pts = [A, G_, F, E, D, C, B];
  } else {
    const tab = tabOpts ?? {
      tabLengthIn: g.halfRidge,
      tabHeightIn: g.plumbCutLength / 3,
    };
    const tipX = R + tab.tabLengthIn;
    const BR_bot: Vec2 = [tipX, yB];
    const TL_bot: Vec2 = [tipX, yB + tab.tabHeightIn];
    const TR_bot: Vec2 = [R, yB + tab.tabHeightIn];
    const BL_top: Vec2 = [R, yT - tab.tabHeightIn];
    const TL_top: Vec2 = [tipX, yT - tab.tabHeightIn];
    const TR_top: Vec2 = [tipX, yT];
    pts = [A, G_, F, E, D, C, B, BR_bot, TL_bot, TR_bot, BL_top, TL_top, TR_top];
  }
  if (!mirror) return pts;
  const center = g.halfSpan;
  return pts.map(([x, y]): Vec2 => [2 * center - x, y]);
}

export function rafterFlat(
  g: RoofGeometry,
  p: RoofParams,
  tabOpts?: RafterTabOpts | null,
): Polygon {
  return installedToFlat(rafterInstalled(g, p, false, tabOpts));
}

export function joistInstalled(g: RoofGeometry, p: RoofParams, joistDepthIn: number): Polygon {
  const { tanT } = g;
  return [
    [p.wallThicknessIn, 0],
    [p.spanIn - p.wallThicknessIn, 0],
    [p.spanIn - p.wallThicknessIn - joistDepthIn / tanT, joistDepthIn],
    [p.wallThicknessIn + joistDepthIn / tanT, joistDepthIn],
  ];
}

export function collarTieInstalled(
  g: RoofGeometry,
  p: RoofParams,
  collarDepthIn: number,
  fractionFromTop: number,
): Polygon {
  const { tanT, riseAtRidgeFace } = g;
  const yTopEdge = riseAtRidgeFace * (1 - fractionFromTop);
  const yBotEdge = yTopEdge - collarDepthIn;
  return [
    [p.wallThicknessIn + yBotEdge / tanT, yBotEdge],
    [p.spanIn - p.wallThicknessIn - yBotEdge / tanT, yBotEdge],
    [p.spanIn - p.wallThicknessIn - yTopEdge / tanT, yTopEdge],
    [p.wallThicknessIn + yTopEdge / tanT, yTopEdge],
  ];
}
