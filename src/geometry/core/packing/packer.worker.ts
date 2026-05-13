/// <reference lib="webworker" />

import { packAsync } from './nfp-packer';
import type { Piece, Sheet, PlacedPiece } from '../types';

interface WorkerInput {
  pieces: Piece[];
  sheet: Sheet;
  rotations: number[];
  pieceSpacingIn: number;
  effort: 'realtime' | 'high';
  chunkSize?: number;
}

type WorkerOutput =
  | { type: 'progress'; pct: number }
  | { type: 'partial'; placed: PlacedPiece[]; totalHeightIn: number }
  | {
      type: 'done';
      placed: PlacedPiece[];
      totalHeightIn: number;
      warnings: string[];
      density: number;
      solveTimeMs: number;
    }
  | { type: 'error'; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (e: MessageEvent<WorkerInput>) => {
  void runPack(e.data);
});

async function runPack(input: WorkerInput): Promise<void> {
  try {
    const out = await packAsync(input.pieces, input.sheet, {
      rotations: input.rotations,
      pieceSpacingIn: input.pieceSpacingIn,
      effort: input.effort,
      chunkSize: input.chunkSize,
      onTryComplete: (tryIdx, totalTries) => {
        const msg: WorkerOutput = { type: 'progress', pct: tryIdx / totalTries };
        ctx.postMessage(msg);
      },
      onPartial: (partial) => {
        const msg: WorkerOutput = {
          type: 'partial',
          placed: partial.placed,
          totalHeightIn: partial.totalHeightIn,
        };
        ctx.postMessage(msg);
      },
    });
    const done: WorkerOutput = {
      type: 'done',
      placed: out.placed,
      totalHeightIn: out.totalHeightIn,
      warnings: out.warnings,
      density: out.density,
      solveTimeMs: out.solveTimeMs,
    };
    ctx.postMessage(done);
  } catch (err) {
    const msg: WorkerOutput = { type: 'error', message: (err as Error)?.message ?? String(err) };
    ctx.postMessage(msg);
  }
}
