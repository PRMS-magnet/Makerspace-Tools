import type { Piece, Sheet, PlacedPiece } from '../types';
import { bboxLayoutOnSheet } from './bbox-fallback';
import { packAsync as nfpPackAsync, type PackAsyncOpts } from './nfp-packer';

export interface PackOptions {
  effort?: 'realtime' | 'high';
  rotations?: number[];
  signal?: AbortSignal;
}

export interface PackInWorkerOptions extends PackOptions {

  onProgress?: (pct: number) => void;

  onPartial?: (partial: { placed: PlacedPiece[]; totalHeightIn: number }) => void;

  chunkSize?: number;
}

export interface PackResult {
  placed: PlacedPiece[];
  totalHeightIn: number;
  warnings: string[];
  density: number;
  solveTimeMs: number;
  packer: 'ts-nfp' | 'bbox-fallback';
}

const DEFAULT_ROTATIONS = [0, 90, 180, 270];
const REALTIME_ROTATIONS = [0, 90];

function bboxResult(pieces: Piece[], sheet: Sheet): PackResult {
  const r = bboxLayoutOnSheet(pieces, sheet);
  return {
    placed: r.placed,
    totalHeightIn: r.totalHeightIn,
    warnings: r.warnings,
    density: 0,
    solveTimeMs: 0,
    packer: 'bbox-fallback',
  };
}

let _yieldChan: MessageChannel | null = null;
function yieldToBrowser(): Promise<void> {
  if (typeof MessageChannel === 'undefined') {
    return new Promise((r) => setTimeout(r, 0));
  }
  if (!_yieldChan) _yieldChan = new MessageChannel();
  const chan = _yieldChan;
  return new Promise((resolve) => {
    chan.port1.onmessage = () => resolve();
    chan.port2.postMessage(0);
  });
}

export async function pack(
  pieces: Piece[],
  sheet: Sheet,
  opts: PackOptions = {},
): Promise<PackResult> {
  if (typeof window === 'undefined') {

    return bboxResult(pieces, sheet);
  }
  const packOpts: PackAsyncOpts = {
    rotations: opts.rotations ?? DEFAULT_ROTATIONS,
    pieceSpacingIn: sheet.pieceSpacingIn ?? 0,
    effort: opts.effort ?? 'realtime',
    yieldHook: yieldToBrowser,
    signal: opts.signal,
  };
  try {
    const r = await nfpPackAsync(pieces, sheet, packOpts);
    return { ...r, packer: 'ts-nfp' };
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') throw e;
    const fallback = bboxResult(pieces, sheet);
    fallback.warnings.push(`Polygon packer failed (${(e as Error).message ?? e}); using bbox fallback.`);
    return fallback;
  }
}

export async function packInWorker(
  pieces: Piece[],
  sheet: Sheet,
  opts: PackInWorkerOptions = {},
): Promise<PackResult> {
  if (typeof Worker === 'undefined') {
    if (opts.onProgress) opts.onProgress(0);
    const r = await pack(pieces, sheet, opts);
    if (opts.onProgress) opts.onProgress(1);
    return r;
  }
  const { default: PackerWorker } = await import('./packer.worker.ts?worker');
  const worker = new PackerWorker();
  return new Promise<PackResult>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      worker.terminate();
      if (opts.signal) opts.signal.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (opts.signal) {
      if (opts.signal.aborted) { onAbort(); return; }
      opts.signal.addEventListener('abort', onAbort, { once: true });
    }
    worker.addEventListener('message', (e: MessageEvent) => {
      if (settled) return;
      const msg = e.data as { type: string } & Record<string, unknown>;
      if (msg.type === 'progress') {
        opts.onProgress?.(msg.pct as number);
      } else if (msg.type === 'partial') {
        opts.onPartial?.({
          placed: msg.placed as PlacedPiece[],
          totalHeightIn: msg.totalHeightIn as number,
        });
      } else if (msg.type === 'done') {
        settled = true;
        cleanup();
        resolve({
          placed: msg.placed as PlacedPiece[],
          totalHeightIn: msg.totalHeightIn as number,
          warnings: msg.warnings as string[],
          density: msg.density as number,
          solveTimeMs: msg.solveTimeMs as number,
          packer: 'ts-nfp',
        });
      } else if (msg.type === 'error') {
        settled = true;
        cleanup();
        const fallback = bboxResult(pieces, sheet);
        fallback.warnings.push(`Polygon packer failed (${msg.message as string}); using bbox fallback.`);
        resolve(fallback);
      }
    });
    worker.addEventListener('error', (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      const fallback = bboxResult(pieces, sheet);
      fallback.warnings.push(`Pack worker errored (${err.message}); using bbox fallback.`);
      resolve(fallback);
    });
    const effort = opts.effort ?? 'high';
    worker.postMessage({
      pieces,
      sheet,

      rotations: opts.rotations ?? (effort === 'realtime' ? REALTIME_ROTATIONS : DEFAULT_ROTATIONS),
      pieceSpacingIn: sheet.pieceSpacingIn ?? 0,
      effort,
      chunkSize: opts.chunkSize,
    });
  });
}

export { bboxLayoutOnSheet };
