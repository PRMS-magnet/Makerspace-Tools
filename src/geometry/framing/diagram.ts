import type { FramingParams } from './types';
import { computeFramingGeometry, computeMemberPositions } from './compute';
import { resolveBlockingRows } from './blocking';

function fmt(n: number): string {
  return n.toFixed(4);
}

export function buildFramingDiagramSvg(p: FramingParams): string {
  const margin = 0.5;
  const geom = computeFramingGeometry(p);
  const memberPositions = computeMemberPositions(p);
  const nBays = Math.max(0, memberPositions.length - 1);
  const blockRows = resolveBlockingRows(p.blocking, nBays, geom.interEndCapSpanIn);

  const endCapOverhang = p.stockThicknessIn / 2;
  const endCapTotalLen = p.lengthIn + p.stockThicknessIn;
  const w = endCapTotalLen + 2 * margin;
  const h = p.spanIn + 2 * margin;
  const parts: string[] = [];

  // End cap A (bottom for wall, front for floor — both render at the bottom of the canvas)
  parts.push(
    `<rect x="${fmt(margin - endCapOverhang)}" y="${fmt(margin + p.spanIn - p.endCapHeightIn)}" width="${fmt(endCapTotalLen)}" height="${fmt(p.endCapHeightIn)}" fill="#d4a373" stroke="#000" stroke-width="0.01"/>`,
  );
  // End cap B (top / back) — stacks at the top
  for (let layer = 0; layer < geom.nEndCapBLayers; layer++) {
    const y = margin + layer * p.endCapHeightIn;
    parts.push(
      `<rect x="${fmt(margin - endCapOverhang)}" y="${fmt(y)}" width="${fmt(endCapTotalLen)}" height="${fmt(p.endCapHeightIn)}" fill="#d4a373" stroke="#000" stroke-width="0.01"/>`,
    );
  }

  // Members (drawn with along-axis footprint = stockThickness; on-edge model)
  const memberYTop = margin + geom.nEndCapBLayers * p.endCapHeightIn;
  for (const xCenter of memberPositions) {
    parts.push(
      `<rect x="${fmt(margin + xCenter - p.stockThicknessIn / 2)}" y="${fmt(memberYTop)}" width="${fmt(p.stockThicknessIn)}" height="${fmt(geom.interEndCapSpanIn)}" fill="#e9c46a" stroke="#000" stroke-width="0.01"/>`,
    );
  }

  // Blocking
  for (const row of blockRows) {
    const y = memberYTop + row.positionFromEndCapAIn - p.blockingThicknessIn / 2;
    const x = row.spanFullLength
      ? margin
      : margin + memberPositions[row.bayIndex] + p.stockThicknessIn / 2;
    const ww = row.spanFullLength ? p.lengthIn : geom.bayWidthIn;
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
