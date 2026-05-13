import type { Building } from './types';
import { pitchTangent, wingRidgeEndpointY } from './intersect/common';

interface FootprintRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function footprintForUnit(b: Building, unitIndex: number): FootprintRect {
  const u = b.units[unitIndex];
  if (unitIndex === 0) {
    return { x0: 0, y0: 0, x1: u.houseLengthIn, y1: u.spanIn };
  }
  const inter = b.intersections[0];
  if (!inter) return { x0: 0, y0: 0, x1: u.houseLengthIn, y1: u.spanIn };

  const host = b.units[0];

  if (inter.kind === 'cross-gable-T') {
    const xCenter = (inter.placement as { xAlongHostRidge: number }).xAlongHostRidge;
    return {
      x0: xCenter - u.spanIn / 2,
      y0: host.spanIn,
      x1: xCenter + u.spanIn / 2,
      y1: host.spanIn + u.houseLengthIn,
    };
  }
  if (inter.kind === 'cross-gable-L') {
    const corner = (inter.placement as { hostCorner: 'NW' | 'NE' | 'SW' | 'SE' }).hostCorner;
    switch (corner) {
      case 'NW': return { x0: 0, y0: host.spanIn, x1: u.spanIn, y1: host.spanIn + u.houseLengthIn };
      case 'NE': return { x0: host.houseLengthIn - u.spanIn, y0: host.spanIn, x1: host.houseLengthIn, y1: host.spanIn + u.houseLengthIn };
      case 'SW': return { x0: 0, y0: -u.houseLengthIn, x1: u.spanIn, y1: 0 };
      case 'SE': return { x0: host.houseLengthIn - u.spanIn, y0: -u.houseLengthIn, x1: host.houseLengthIn, y1: 0 };
    }
  }
  return { x0: 0, y0: 0, x1: u.houseLengthIn, y1: u.spanIn };
}

function fmt(n: number): string {
  return n.toFixed(4);
}

export function buildPlanDiagram(b: Building, marginIn = 1): string {
  const rects = b.units.map((_, i) => footprintForUnit(b, i));
  const minX = Math.min(...rects.map((r) => r.x0)) - marginIn;
  const minY = Math.min(...rects.map((r) => r.y0)) - marginIn;
  const maxX = Math.max(...rects.map((r) => r.x1)) + marginIn;
  const maxY = Math.max(...rects.map((r) => r.y1)) + marginIn;
  const w = maxX - minX;
  const h = maxY - minY;

  const tx = (x: number) => fmt(x - minX);
  const ty = (y: number) => fmt(y - minY);
  const parts: string[] = [];

  for (const r of rects) {
    parts.push(
      `<rect x="${tx(r.x0)}" y="${ty(r.y0)}" width="${fmt(r.x1 - r.x0)}" height="${fmt(r.y1 - r.y0)}" ` +
        `fill="none" stroke="#000" stroke-width="0.04" data-kind="eave"/>`,
    );
  }

  for (let i = 0; i < b.units.length; i++) {
    const fr = rects[i];
    let x1 = fr.x0;
    let y1 = (fr.y0 + fr.y1) / 2;
    let x2 = fr.x1;
    let y2 = y1;
    if (i === 1 && b.intersections[0]) {
      const xCenter =
        b.intersections[0].kind === 'cross-gable-T'
          ? (b.intersections[0].placement as { xAlongHostRidge: number }).xAlongHostRidge
          : (fr.x0 + fr.x1) / 2;
      x1 = xCenter;
      y1 = fr.y0;
      x2 = xCenter;
      y2 = fr.y1;
    }
    parts.push(
      `<line x1="${tx(x1)}" y1="${ty(y1)}" x2="${tx(x2)}" y2="${ty(y2)}" ` +
        `stroke="#0000cc" stroke-width="0.025" data-kind="ridge"/>`,
    );
  }

  const inter = b.intersections[0];
  if (inter) {
    const host = b.units[0];
    const guest = b.units[1];
    const m_main = pitchTangent(host);
    const m_wing = pitchTangent(guest);
    const yEnd = wingRidgeEndpointY({
      Y_main: host.spanIn,
      S_wing: guest.spanIn,
      m_main,
      m_wing,
    });

    if (inter.kind === 'cross-gable-T') {
      const xCenter = (inter.placement as { xAlongHostRidge: number }).xAlongHostRidge;
      const halfSpan = guest.spanIn / 2;
      parts.push(
        `<line x1="${tx(xCenter + halfSpan)}" y1="${ty(host.spanIn)}" x2="${tx(xCenter)}" y2="${ty(yEnd)}" ` +
          `stroke="#cc0000" stroke-width="0.025" data-kind="valley"/>`,
      );
      parts.push(
        `<line x1="${tx(xCenter - halfSpan)}" y1="${ty(host.spanIn)}" x2="${tx(xCenter)}" y2="${ty(yEnd)}" ` +
          `stroke="#cc0000" stroke-width="0.025" data-kind="valley"/>`,
      );
    } else if (inter.kind === 'cross-gable-L') {
      const corner = (inter.placement as { hostCorner: 'NW' | 'NE' | 'SW' | 'SE' }).hostCorner;
      const fr = rects[1];
      const xCenter = (fr.x0 + fr.x1) / 2;
      const startX = corner === 'NW' || corner === 'SW' ? fr.x1 : fr.x0;
      const startY = corner === 'NW' || corner === 'NE' ? host.spanIn : 0;
      const endX = xCenter;
      const endY = corner === 'NW' || corner === 'NE' ? yEnd : host.spanIn - yEnd;
      parts.push(
        `<line x1="${tx(startX)}" y1="${ty(startY)}" x2="${tx(endX)}" y2="${ty(endY)}" ` +
          `stroke="#cc0000" stroke-width="0.025" data-kind="valley"/>`,
      );
    }
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(w)}in" height="${fmt(h)}in" ` +
    `viewBox="0 0 ${fmt(w)} ${fmt(h)}" style="max-width:100%;height:auto;display:block;">\n` +
    parts.map((p) => '  ' + p).join('\n') +
    `\n</svg>\n`
  );
}
