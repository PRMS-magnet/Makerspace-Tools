import type { Polygon, LaserOp, Vec2, PolygonWithHoles, PlacedPiece } from './types';
import { LASER_COLORS, isPolygonWithHoles } from './types';

export function pathFromPolygon(p: Polygon | PolygonWithHoles, offset: Vec2 = [0, 0]): string {
  if (isPolygonWithHoles(p)) {
    const parts = [pathFromPolygon(p.outline, offset), ...p.holes.map((h) => pathFromPolygon(h, offset))];
    return parts.join(' ');
  }
  const [ox, oy] = offset;
  return 'M ' + p.map(([x, y]) => `${(x + ox).toFixed(4)},${(y + oy).toFixed(4)}`).join(' L ') + ' Z';
}

export function svgRect(x: number, y: number, w: number, h: number): string {
  return (
    `M${x.toFixed(4)},${y.toFixed(4)} ` +
    `L${(x + w).toFixed(4)},${y.toFixed(4)} ` +
    `L${(x + w).toFixed(4)},${(y + h).toFixed(4)} ` +
    `L${x.toFixed(4)},${(y + h).toFixed(4)} Z`
  );
}

export interface SvgDocumentOpts {
  widthIn: number;
  heightIn: number;
  body: string;
  strokeWidthIn?: number;
  op?: LaserOp;
  title?: string;
}

export function svgDocument(opts: SvgDocumentOpts): string {
  const stroke = opts.strokeWidthIn ?? 0.01;
  const op: LaserOp = opts.op ?? 'cut';
  const color = LASER_COLORS[op];
  const titleEl = opts.title ? `  <title>${escapeXml(opts.title)}</title>\n` : '';
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.widthIn}in" height="${opts.heightIn.toFixed(3)}in" viewBox="0 0 ${opts.widthIn} ${opts.heightIn.toFixed(3)}" style="max-width:100%;height:auto;display:block;">\n` +
    titleEl +
    `  <g fill="none" stroke="${color}" stroke-width="${stroke}" fill-rule="evenodd">\n` +
    `${opts.body}\n` +
    `  </g>\n` +
    `</svg>\n`
  );
}

export function composeMultiOpCutSvg(
  placed: PlacedPiece[],
  totalHeightIn: number,
  sheetWidthIn: number,
): string {
  const body = placed
    .map((pp) => {
      const color = LASER_COLORS[pp.op];
      // No dashed stroke -- the laser would follow a dashed path and produce
      // intermittent cuts. Spares are identified by label and by position in
      // the layout (clustered after the canonical pieces of each kind).
      const outlineEl = pp.op === 'engrave'
        ? `    <path d="${pathFromPolygon(pp.polygon, pp.offsetIn)}" stroke="${color}" fill="${color}" fill-opacity="0.35" stroke-width="0.005"/>`
        : `    <path d="${pathFromPolygon(pp.polygon, pp.offsetIn)}" stroke="${color}" fill="none" stroke-width="0.005"/>`;
      if (!pp.engravedFeatures || pp.engravedFeatures.length === 0) return outlineEl;
      const engraveColor = LASER_COLORS.engrave;
      const featureEls = pp.engravedFeatures
        .map((feat) => `    <path d="${pathFromPolygon(feat, pp.offsetIn)}" stroke="${engraveColor}" fill="${engraveColor}" fill-opacity="0.35" stroke-width="0.005"/>`)
        .join('\n');
      return `${outlineEl}\n${featureEls}`;
    })
    .join('\n');
  return svgDocument({
    widthIn: sheetWidthIn,
    heightIn: totalHeightIn,
    body,
    op: 'cut',
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
