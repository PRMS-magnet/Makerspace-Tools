import type { Vec2, Polygon } from '../core/types';
import { rafterInstalled, joistInstalled, collarTieInstalled } from './polygons';
import type { RoofParams, RoofGeometry } from './types';
import { LIGHT_TOKENS, type DiagramTokens } from '../../lib/diagram-tokens';

interface ViewConfig {
  viewboxWidth: number;
  leftMarginPx: number;
  rightMarginPx: number;
  topPadPx: number;
  bottomPadPx: number;
  wallStubHeightIn: number;
}

const DEFAULT_VIEW: ViewConfig = {
  viewboxWidth: 680,
  leftMarginPx: 110,
  rightMarginPx: 130,
  topPadPx: 30,
  bottomPadPx: 60,
  wallStubHeightIn: 0.4,
};

export type DiagramColorMode = DiagramTokens | 'css-vars';

interface ColorRefs {
  fillWood: string;
  strokeWood: string;
  fillStruct: string;
  strokeStruct: string;
  fillWall: string;
  strokeWall: string;
  fillRidge: string;
  strokeRidge: string;
  line: string;
  text: string;
}

const CSS_VAR_REFS: ColorRefs = {
  fillWood: 'var(--mt-diag-fill-wood)',
  strokeWood: 'var(--mt-diag-stroke-wood)',
  fillStruct: 'var(--mt-diag-fill-struct)',
  strokeStruct: 'var(--mt-diag-stroke-struct)',
  fillWall: 'var(--mt-diag-fill-wall)',
  strokeWall: 'var(--mt-diag-stroke-wall)',
  fillRidge: 'var(--mt-diag-fill-ridge)',
  strokeRidge: 'var(--mt-diag-stroke-ridge)',
  line: 'var(--mt-diag-line)',
  text: 'var(--mt-diag-text)',
};

function colorRefs(mode: DiagramColorMode): ColorRefs {
  if (mode === 'css-vars') return CSS_VAR_REFS;
  return {
    fillWood: mode.fillWood,
    strokeWood: mode.strokeWood,
    fillStruct: mode.fillStruct,
    strokeStruct: mode.strokeStruct,
    fillWall: mode.fillWall,
    strokeWall: mode.strokeWall,
    fillRidge: mode.fillRidge,
    strokeRidge: mode.strokeRidge,
    line: mode.line,
    text: mode.text,
  };
}

function pathFromPx(pts: Vec2[]): string {
  return 'M ' + pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L ') + ' Z';
}

export function buildDiagramSvg(
  p: RoofParams,
  g: RoofGeometry,
  stockThicknessIn = 0.125,
  ridgeFaceMarginIn = 0.125,
  hasRidge = true,
  view: ViewConfig = DEFAULT_VIEW,
  colorMode: DiagramColorMode = LIGHT_TOKENS,
): string {
  const c = colorRefs(colorMode);
  const marginIn = ridgeFaceMarginIn;
  const joistDepthIn = p.rafterDepthIn;
  const collarDepthIn = p.rafterDepthIn * 0.6;
  const collarFraction = 1 / 3;
  const tabHeight = g.plumbCutLength / 3;
  const rafterTabOpts = hasRidge ? undefined : null;

  const contentXMin = -p.overhangRunIn;
  const contentXMax = p.spanIn + p.overhangRunIn;
  const contentWidthIn = contentXMax - contentXMin;

  const rafterTopAtRidge = g.riseAtRidgeFace + g.plumbCutLength;
  const ridgeBottomY = g.riseAtRidgeFace - marginIn;
  const ridgeTopY = rafterTopAtRidge + marginIn;
  const yMaxIn = Math.max(rafterTopAtRidge, ridgeTopY);
  const yMinIn = -view.wallStubHeightIn;
  const contentHeightIn = yMaxIn - yMinIn;

  const scale = (view.viewboxWidth - view.leftMarginPx - view.rightMarginPx) / contentWidthIn;
  const viewboxHeight = view.topPadPx + view.bottomPadPx + contentHeightIn * scale;

  const toSvg = (xIn: number, yIn: number): Vec2 => [
    view.leftMarginPx + (xIn - contentXMin) * scale,
    view.topPadPx + (yMaxIn - yIn) * scale,
  ];

  const installedToPx = (poly: Polygon): Vec2[] => poly.map(([x, y]) => toSvg(x, y));

  const leftRafter = installedToPx(rafterInstalled(g, p, false, rafterTabOpts));
  const rightRafter = installedToPx(rafterInstalled(g, p, true, rafterTabOpts));
  const joistPx = installedToPx(joistInstalled(g, p, joistDepthIn));
  const collarPx = installedToPx(collarTieInstalled(g, p, collarDepthIn, collarFraction));

  const wallTL = toSvg(0, 0);
  const wallBR = toSvg(p.spanIn, -view.wallStubHeightIn);
  const ridgeTL = toSvg(g.R, ridgeTopY);
  const ridgeBR = toSvg(g.R + stockThicknessIn, ridgeBottomY);

  const arcRIn = Math.min(g.rafterSlopeLength * 0.35, p.spanIn * 0.12);
  const arcRPx = arcRIn * scale;
  const arcStart = toSvg(p.wallThicknessIn + arcRIn, 0);
  const arcEnd = toSvg(p.wallThicknessIn + arcRIn * g.cosT, arcRIn * g.sinT);
  const arcHorizEnd = toSvg(p.wallThicknessIn + arcRIn * 1.3, 0);
  const labelRIn = arcRIn * 0.65;
  const labelPos = toSvg(
    p.wallThicknessIn + labelRIn * Math.cos(g.theta / 2),
    labelRIn * Math.sin(g.theta / 2),
  );

  const spanDimY = -view.wallStubHeightIn - 0.3;
  const spanLeft = toSvg(0, spanDimY);
  const spanRight = toSvg(p.spanIn, spanDimY);
  const spanLabelX = (spanLeft[0] + spanRight[0]) / 2;

  const L: string[] = [];
  L.push('<?xml version="1.0" encoding="UTF-8"?>');
  L.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view.viewboxWidth} ${viewboxHeight.toFixed(2)}" width="100%">`);
  L.push(`  <defs><marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 5L10 5M5 0L10 5L5 10" fill="none" stroke="${c.line}" stroke-width="1.5"/></marker></defs>`);

  if (colorMode !== 'css-vars') {
    L.push(`  <rect x="0" y="0" width="${view.viewboxWidth}" height="${viewboxHeight.toFixed(2)}" fill="${colorMode.background}"/>`);
  }

  L.push(`  <rect x="${Math.min(wallTL[0], wallBR[0]).toFixed(2)}" y="${Math.min(wallTL[1], wallBR[1]).toFixed(2)}" width="${Math.abs(wallBR[0] - wallTL[0]).toFixed(2)}" height="${Math.abs(wallBR[1] - wallTL[1]).toFixed(2)}" fill="${c.fillWall}" stroke="${c.strokeWall}" stroke-width="0.5"/>`);

  L.push(`  <path d="${pathFromPx(joistPx)}" fill="${c.fillStruct}" stroke="${c.strokeStruct}" stroke-width="0.5"/>`);
  L.push(`  <path d="${pathFromPx(leftRafter)}" fill="${c.fillWood}" stroke="${c.strokeWood}" stroke-width="0.5"/>`);
  L.push(`  <path d="${pathFromPx(rightRafter)}" fill="${c.fillWood}" stroke="${c.strokeWood}" stroke-width="0.5"/>`);
  if (hasRidge) {
    const ridgeX = Math.min(ridgeTL[0], ridgeBR[0]);
    const ridgeY = Math.min(ridgeTL[1], ridgeBR[1]);
    const ridgeW = Math.abs(ridgeBR[0] - ridgeTL[0]);
    const ridgeH = Math.abs(ridgeBR[1] - ridgeTL[1]);
    L.push(`  <rect x="${ridgeX.toFixed(2)}" y="${ridgeY.toFixed(2)}" width="${ridgeW.toFixed(2)}" height="${ridgeH.toFixed(2)}" fill="${c.fillRidge}" stroke="${c.strokeRidge}" stroke-width="0.5"/>`);

    const topSlotCenterY = g.riseAtRidgeFace + g.plumbCutLength - tabHeight / 2;
    const botSlotCenterY = g.riseAtRidgeFace + tabHeight / 2;
    for (const cy of [topSlotCenterY, botSlotCenterY]) {
      const slotTL = toSvg(g.R, cy + tabHeight / 2);
      const slotBR = toSvg(g.R + stockThicknessIn, cy - tabHeight / 2);
      const sx = Math.min(slotTL[0], slotBR[0]);
      const sy = Math.min(slotTL[1], slotBR[1]);
      const sw = Math.abs(slotBR[0] - slotTL[0]);
      const sh = Math.abs(slotBR[1] - slotTL[1]);
      L.push(`  <rect x="${sx.toFixed(2)}" y="${sy.toFixed(2)}" width="${sw.toFixed(2)}" height="${sh.toFixed(2)}" fill="${c.fillWall}" stroke="${c.strokeWood}" stroke-width="0.5"/>`);
    }
  }
  L.push(`  <path d="${pathFromPx(collarPx)}" fill="${c.fillStruct}" stroke="${c.strokeStruct}" stroke-width="0.5"/>`);

  L.push(`  <line x1="${arcStart[0].toFixed(2)}" y1="${arcStart[1].toFixed(2)}" x2="${arcHorizEnd[0].toFixed(2)}" y2="${arcHorizEnd[1].toFixed(2)}" stroke="${c.line}" stroke-width="0.75" stroke-dasharray="4 3"/>`);
  L.push(`  <path d="M ${arcStart[0].toFixed(2)} ${arcStart[1].toFixed(2)} A ${arcRPx.toFixed(2)} ${arcRPx.toFixed(2)} 0 0 0 ${arcEnd[0].toFixed(2)} ${arcEnd[1].toFixed(2)}" fill="none" stroke="${c.line}" stroke-width="1.25"/>`);
  L.push(`  <text x="${labelPos[0].toFixed(2)}" y="${labelPos[1].toFixed(2)}" font-family="sans-serif" font-size="14" font-weight="500" fill="${c.text}" text-anchor="middle">${g.thetaDeg.toFixed(1)}°</text>`);

  L.push(`  <line x1="${spanLeft[0].toFixed(2)}" y1="${spanLeft[1].toFixed(2)}" x2="${spanRight[0].toFixed(2)}" y2="${spanRight[1].toFixed(2)}" stroke="${c.line}" stroke-width="0.5" marker-start="url(#a)" marker-end="url(#a)"/>`);
  L.push(`  <text x="${spanLabelX.toFixed(2)}" y="${(spanLeft[1] + 22).toFixed(2)}" font-family="sans-serif" font-size="14" fill="${c.text}" text-anchor="middle">${p.spanIn.toFixed(2)}″ span</text>`);

  L.push('</svg>');
  return L.join('\n');
}
