import type { FloorParams } from './types';
import { computeFloorGeometry, computeJoistPositions } from './compute';
import { resolveBlockingRows } from './blocking';

function fmt(n: number): string {
  return n.toFixed(4);
}

export function buildFloorDiagramSvg(p: FloorParams): string {
  const margin = 0.5;
  const geom = computeFloorGeometry(p);
  const joistPositions = computeJoistPositions(p);
  const nBays = Math.max(0, joistPositions.length - 1);
  const blockRows = resolveBlockingRows(p.blocking, nBays, geom.interRimDepthIn);

  const rimOverhang = p.joistThicknessIn / 2;
  const rimTotalLen = p.widthIn + p.joistThicknessIn;
  const w = rimTotalLen + 2 * margin;
  const h = p.depthIn + 2 * margin;
  const parts: string[] = [];

  parts.push(
    `<rect x="${fmt(margin - rimOverhang)}" y="${fmt(margin)}" width="${fmt(rimTotalLen)}" height="${fmt(p.rimThicknessIn)}" fill="#d4a373" stroke="#000" stroke-width="0.01"/>`,
  );
  parts.push(
    `<rect x="${fmt(margin - rimOverhang)}" y="${fmt(margin + p.depthIn - p.rimThicknessIn)}" width="${fmt(rimTotalLen)}" height="${fmt(p.rimThicknessIn)}" fill="#d4a373" stroke="#000" stroke-width="0.01"/>`,
  );

  const joistYTop = margin + p.rimThicknessIn;
  for (const xCenter of joistPositions) {
    parts.push(
      `<rect x="${fmt(margin + xCenter - p.joistThicknessIn / 2)}" y="${fmt(joistYTop)}" width="${fmt(p.joistThicknessIn)}" height="${fmt(geom.interRimDepthIn)}" fill="#e9c46a" stroke="#000" stroke-width="0.01"/>`,
    );
  }

  for (const row of blockRows) {
    const y = joistYTop + row.distanceFromFrontRimIn - p.blockingThicknessIn / 2;
    const x = row.spanFullWidth
      ? margin
      : margin + joistPositions[row.bayIndex] + p.joistThicknessIn / 2;
    const ww = row.spanFullWidth ? p.widthIn : geom.bayWidthIn;
    parts.push(
      `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(ww)}" height="${fmt(p.blockingThicknessIn)}" fill="#a8dadc" stroke="#000" stroke-width="0.01"/>`,
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(w)}in" height="${fmt(h)}in" viewBox="0 0 ${fmt(w)} ${fmt(h)}" style="max-width:100%;height:auto;display:block;">\n` +
    parts.map((r) => '  ' + r).join('\n') +
    `\n</svg>\n`
  );
}
