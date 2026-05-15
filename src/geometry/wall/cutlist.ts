import type { Piece } from '../core/types';
import type { WallParams } from './types';
import { computeWallGeometry, computeStudPositions } from './compute';
import { resolveBlockingRows } from './blocking';
import { rectanglePolygon } from './polygons';

export interface WallCutListResult {
  pieces: Piece[];
  warnings: string[];
}

export function buildWallCutListPieces(p: WallParams, wallId: string): WallCutListResult {
  const pieces: Piece[] = [];
  const warnings: string[] = [];

  const geom = computeWallGeometry(p);
  const studPositions = computeStudPositions(p);
  const nStuds = studPositions.length;
  const nBays = Math.max(0, nStuds - 1);
  const rows = resolveBlockingRows(p.blocking, nBays, geom.interPlateHeightIn);

  const nPlateSegs = Math.max(1, Math.ceil(p.widthIn / p.maxPieceLengthIn));
  const plateSegLen = p.widthIn / nPlateSegs;

  for (let s = 0; s < nPlateSegs; s++) {
    pieces.push({
      polygon: rectanglePolygon(plateSegLen, p.bottomPlateHeightIn),
      op: 'cut',
      label: 'bottom-plate',
      placement: { kind: 'wall-bottom-plate', wallId },
    });
  }

  for (let layer = 0; layer < geom.nTopPlateLayers; layer++) {
    for (let s = 0; s < nPlateSegs; s++) {
      pieces.push({
        polygon: rectanglePolygon(plateSegLen, p.topPlateHeightIn),
        op: 'cut',
        label: 'top-plate',
        placement: { kind: 'wall-top-plate', wallId, layer: layer as 0 | 1 },
      });
    }
  }

  for (let i = 0; i < nStuds; i++) {
    pieces.push({
      polygon: rectanglePolygon(p.studWidthIn, geom.interPlateHeightIn),
      op: 'cut',
      label: 'stud',
      placement: { kind: 'wall-stud', wallId, indexAlongWall: i },
    });
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const w = row.spanFullWidth ? p.widthIn : geom.bayWidthIn;
    pieces.push({
      polygon: rectanglePolygon(w, p.blockingThicknessIn),
      op: 'cut',
      label: 'block',
      placement: { kind: 'wall-block', wallId, bayIndex: row.bayIndex, rowIndex: r },
    });
  }

  for (let i = 0; i < nStuds; i++) {
    pieces.push({
      polygon: rectanglePolygon(p.studWidthIn, p.bottomPlateHeightIn),
      op: 'engrave',
      label: 'stud-mark-bottom',
      placement: { kind: 'wall-stud-mark', wallId, indexAlongWall: i, plate: 'bottom' },
    });
    pieces.push({
      polygon: rectanglePolygon(p.studWidthIn, p.topPlateHeightIn),
      op: 'engrave',
      label: 'stud-mark-top',
      placement: { kind: 'wall-stud-mark', wallId, indexAlongWall: i, plate: 'top' },
    });
  }

  if (p.widthIn > p.maxPieceLengthIn) {
    warnings.push(`Wall width ${p.widthIn.toFixed(2)} in exceeds max piece length; plates split into ${nPlateSegs} segments`);
  }

  return { pieces, warnings };
}
