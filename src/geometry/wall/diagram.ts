import type { WallParams } from './types';
import { computeWallGeometry, computeStudPositions } from './compute';
import { resolveBlockingRows } from './blocking';

function fmt(n: number): string {
  return n.toFixed(4);
}

export function buildWallDiagramSvg(p: WallParams): string {
  const margin = 0.5;
  const geom = computeWallGeometry(p);
  const studPositions = computeStudPositions(p);
  const nBays = Math.max(0, studPositions.length - 1);
  const blockRows = resolveBlockingRows(p.blocking, nBays, geom.interPlateHeightIn);

  const plateOverhang = p.studWidthIn / 2;
  const plateTotalLen = p.widthIn + p.studWidthIn;
  const w = plateTotalLen + 2 * margin;
  const h = p.heightIn + 2 * margin;
  const parts: string[] = [];

  parts.push(
    `<rect x="${fmt(margin - plateOverhang)}" y="${fmt(margin + p.heightIn - p.bottomPlateHeightIn)}" width="${fmt(plateTotalLen)}" height="${fmt(p.bottomPlateHeightIn)}" fill="#d4a373" stroke="#000" stroke-width="0.01"/>`,
  );
  for (let layer = 0; layer < geom.nTopPlateLayers; layer++) {
    const y = margin + layer * p.topPlateHeightIn;
    parts.push(
      `<rect x="${fmt(margin - plateOverhang)}" y="${fmt(y)}" width="${fmt(plateTotalLen)}" height="${fmt(p.topPlateHeightIn)}" fill="#d4a373" stroke="#000" stroke-width="0.01"/>`,
    );
  }

  const studYTop = margin + geom.nTopPlateLayers * p.topPlateHeightIn;
  for (const xCenter of studPositions) {
    parts.push(
      `<rect x="${fmt(margin + xCenter - p.studWidthIn / 2)}" y="${fmt(studYTop)}" width="${fmt(p.studWidthIn)}" height="${fmt(geom.interPlateHeightIn)}" fill="#e9c46a" stroke="#000" stroke-width="0.01"/>`,
    );
  }

  for (const row of blockRows) {
    const y = studYTop + row.heightFromBottomPlateIn - p.blockingThicknessIn / 2;
    const x = row.spanFullWidth
      ? margin
      : margin + studPositions[row.bayIndex] + p.studWidthIn / 2;
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
