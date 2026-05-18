import type { Piece, Sheet, PlacedPiece, Polygon, PolygonWithHoles, Vec2 } from '../types';
import { isPolygonWithHoles } from '../types';
import {
  rotatePolyDeg, translate, signedArea, ensureCCW, convexHull,
  nfpConvex, ifpRect, pointStrictlyInside, segmentIntersection,
  inflateConvex, bboxOf,
} from './geom';

export interface PackOpts {
  rotations: number[];
  pieceSpacingIn: number;
  effort?: 'realtime' | 'high';
}

export interface PackOutput {
  placed: PlacedPiece[];
  totalHeightIn: number;
  warnings: string[];
  density: number;
  solveTimeMs: number;
}

const EPS = 1e-7;

interface FlatItem {
  source: Piece;

  flat: Polygon;

  holes: readonly Polygon[];
  area: number;
}

interface RotatedShape {
  rotationDeg: number;

  hull: Polygon;

  display: Polygon;

  refOffset: Vec2;
}

interface PreparedItem {
  flat: FlatItem;
  rotations: RotatedShape[];
}

interface PlacedRef {

  rot: RotatedShape;
  dx: number;
  dy: number;
  bbMaxY: number;
}

interface NfpCanonicalEntry {
  poly: Polygon;
  bb: { minX: number; minY: number; maxX: number; maxY: number };
}
type NfpCache = Map<RotatedShape, Map<RotatedShape, NfpCanonicalEntry>>;

interface NfpEntry {
  poly: Polygon;
  minX: number; minY: number; maxX: number; maxY: number;
}

function getCanonicalEntry(cache: NfpCache, rotA: RotatedShape, rotB: RotatedShape): NfpCanonicalEntry {
  let inner = cache.get(rotA);
  if (!inner) {
    inner = new Map();
    cache.set(rotA, inner);
  }
  let entry = inner.get(rotB);
  if (!entry) {
    const poly = nfpConvex(rotA.hull, rotB.hull, rotB.refOffset);
    entry = { poly, bb: bboxOf(poly) };
    inner.set(rotB, entry);
  }
  return entry;
}

function getCanonicalNfp(cache: NfpCache, rotA: RotatedShape, rotB: RotatedShape): Polygon {
  return getCanonicalEntry(cache, rotA, rotB).poly;
}

function canonicalNfpBbox(cache: NfpCache, rotA: RotatedShape, rotB: RotatedShape, _hint?: Polygon): { minX: number; minY: number; maxX: number; maxY: number } {
  return getCanonicalEntry(cache, rotA, rotB).bb;
}

function flattenPieces(pieces: Piece[]): FlatItem[] {
  const out: FlatItem[] = [];
  for (const p of pieces) {
    if (isPolygonWithHoles(p.polygon)) {
      out.push({
        source: p,
        flat: p.polygon.outline,
        holes: p.polygon.holes,
        area: Math.abs(signedArea(p.polygon.outline)),
      });
    } else {
      out.push({
        source: p,
        flat: p.polygon,
        holes: [],
        area: Math.abs(signedArea(p.polygon)),
      });
    }
  }
  return out;
}

function prepare(items: FlatItem[], rotationsDeg: number[], spacingIn: number): PreparedItem[] {

  const cache = new Map<Polygon, Map<readonly number[], RotatedShape[]>>();
  return items.map((flat) => {
    const perPieceRot = flat.source.rotations;
    const rotKey: readonly number[] = perPieceRot ?? rotationsDeg;
    let inner = cache.get(flat.flat);
    if (!inner) { inner = new Map(); cache.set(flat.flat, inner); }
    let rotations = inner.get(rotKey);
    if (!rotations) {
      rotations = rotKey.map((deg): RotatedShape => {
        const display = rotatePolyDeg(flat.flat, deg);
        const hullRaw = ensureCCW(convexHull(display));

        const hull = spacingIn > 0 ? ensureCCW(inflateConvex(hullRaw, spacingIn / 2)) : hullRaw;
        const reordered = reorderBottomLeft(hull);
        const refOffset: Vec2 = [reordered[0][0], reordered[0][1]];
        return { rotationDeg: deg, hull: reordered, display, refOffset };
      });
      inner.set(rotKey, rotations);
    }
    return { flat, rotations };
  });
}

function reorderBottomLeft(poly: Polygon): Polygon {
  let lo = 0;
  for (let i = 1; i < poly.length; i++) {
    if (poly[i][1] < poly[lo][1] - EPS ||
        (Math.abs(poly[i][1] - poly[lo][1]) < EPS && poly[i][0] < poly[lo][0])) {
      lo = i;
    }
  }
  return [...poly.slice(lo), ...poly.slice(0, lo)];
}

interface BLFResult {
  placements: { item: PreparedItem; chosen: RotatedShape; refPos: Vec2 }[];
  maxY: number;
  failed: PreparedItem[];
}

const hullBboxCache = new WeakMap<Polygon, { minX: number; minY: number; maxX: number; maxY: number }>();
function hullBbox(p: Polygon): { minX: number; minY: number; maxX: number; maxY: number } {
  let bb = hullBboxCache.get(p);
  if (!bb) {
    bb = bboxOf(p);
    hullBboxCache.set(p, bb);
  }
  return bb;
}

function findBestPlacement(
  item: PreparedItem,
  placed: PlacedRef[],
  nfpCache: NfpCache,
  xLo: number,
  xHi: number,
  yLo: number,
  yHi: number,
  currentMaxY: number,
): { rot: RotatedShape; refPos: Vec2; layoutMaxY: number; bbMaxY: number } | null {
  let best: { rot: RotatedShape; refPos: Vec2; layoutMaxY: number; bbMaxY: number } | null = null;

  for (const rot of item.rotations) {
    const ifp = ifpRect(rot.hull, xLo, xHi, yLo, yHi);
    if (ifp === null) continue;

    const nfps: NfpEntry[] = placed.length === 0 ? [] : placed.map((p) => {
      const canonical = getCanonicalNfp(nfpCache, p.rot, rot);
      const cbb = canonicalNfpBbox(nfpCache, p.rot, rot, canonical);
      return {
        poly: translate(canonical, [p.dx, p.dy]),
        minX: cbb.minX + p.dx, minY: cbb.minY + p.dy,
        maxX: cbb.maxX + p.dx, maxY: cbb.maxY + p.dy,
      };
    });

    const candidates = enumerateCandidates(ifp, nfps);
    for (const c of candidates) {
      const cx = c[0], cy = c[1];
      let bad = false;
      for (const n of nfps) {

        if (cx < n.minX - EPS || cx > n.maxX + EPS || cy < n.minY - EPS || cy > n.maxY + EPS) continue;
        if (pointStrictlyInside(c, n.poly)) { bad = true; break; }
      }
      if (bad) continue;

      const dx = c[0] - rot.refOffset[0];
      const dy = c[1] - rot.refOffset[1];
      const hb = hullBbox(rot.hull);
      const pMinX = hb.minX + dx;
      const pMaxX = hb.maxX + dx;
      const pMinY = hb.minY + dy;
      const pMaxY = hb.maxY + dy;
      if (pMinX < xLo - EPS || pMaxX > xHi + EPS) continue;
      if (pMinY < yLo - EPS || pMaxY > yHi + EPS) continue;
      const layoutMaxY = Math.max(currentMaxY, pMaxY);
      if (!best || layoutMaxY + EPS < best.layoutMaxY ||
          (Math.abs(layoutMaxY - best.layoutMaxY) < EPS && c[1] + EPS < best.refPos[1]) ||
          (Math.abs(layoutMaxY - best.layoutMaxY) < EPS && Math.abs(c[1] - best.refPos[1]) < EPS && c[0] + EPS < best.refPos[0])) {
        best = { rot, refPos: [c[0], c[1]], layoutMaxY, bbMaxY: pMaxY };
      }
    }
  }

  return best;
}

function singlePass(
  order: PreparedItem[],
  sheetW: number,
  marginIn: number,
  yMaxConsider: number,
  nfpCache: NfpCache,
): BLFResult {
  const placed: PlacedRef[] = [];
  const placements: { item: PreparedItem; chosen: RotatedShape; refPos: Vec2 }[] = [];
  const failed: PreparedItem[] = [];
  let maxY = marginIn;

  const xLo = marginIn;
  const xHi = sheetW - marginIn;
  const yLo = marginIn;
  const yHi = yMaxConsider - marginIn;

  for (const item of order) {
    const best = findBestPlacement(item, placed, nfpCache, xLo, xHi, yLo, yHi, maxY);
    if (!best) { failed.push(item); continue; }
    const dx = best.refPos[0] - best.rot.refOffset[0];
    const dy = best.refPos[1] - best.rot.refOffset[1];
    placed.push({ rot: best.rot, dx, dy, bbMaxY: best.bbMaxY });
    placements.push({ item, chosen: best.rot, refPos: best.refPos });
    maxY = Math.max(maxY, best.bbMaxY);
  }

  return { placements, maxY, failed };
}

export interface YieldHook {

  (placedSoFar: number, total: number): Promise<void> | void;
}

async function singlePassAsync(
  order: PreparedItem[],
  sheetW: number,
  marginIn: number,
  yMaxConsider: number,
  nfpCache: NfpCache,
  yieldHook: YieldHook | undefined,
  chunkSize: number,
  signal: AbortSignal | undefined,
  onChunk: ((snapshot: BLFResult) => void) | undefined,
): Promise<BLFResult> {
  const placed: PlacedRef[] = [];
  const placements: { item: PreparedItem; chosen: RotatedShape; refPos: Vec2 }[] = [];
  const failed: PreparedItem[] = [];
  let maxY = marginIn;

  const xLo = marginIn;
  const xHi = sheetW - marginIn;
  const yLo = marginIn;
  const yHi = yMaxConsider - marginIn;

  for (let idx = 0; idx < order.length; idx++) {
    const item = order[idx];
    const best = findBestPlacement(item, placed, nfpCache, xLo, xHi, yLo, yHi, maxY);
    if (best) {
      const dx = best.refPos[0] - best.rot.refOffset[0];
      const dy = best.refPos[1] - best.rot.refOffset[1];
      placed.push({ rot: best.rot, dx, dy, bbMaxY: best.bbMaxY });
      placements.push({ item, chosen: best.rot, refPos: best.refPos });
      maxY = Math.max(maxY, best.bbMaxY);
    } else {
      failed.push(item);
    }
    if ((idx + 1) % chunkSize === 0) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      if (onChunk) onChunk({ placements: placements.slice(), maxY, failed: failed.slice() });
      if (yieldHook) await yieldHook(idx + 1, order.length);
    }
  }

  return { placements, maxY, failed };
}

function enumerateCandidates(
  ifp: { xMin: number; xMax: number; yMin: number; yMax: number },
  nfps: NfpEntry[],
): Vec2[] {
  const out: Vec2[] = [];
  out.push([ifp.xMin, ifp.yMin]);
  out.push([ifp.xMax, ifp.yMin]);
  for (const n of nfps) {

    if (n.maxX < ifp.xMin - EPS || n.minX > ifp.xMax + EPS ||
        n.maxY < ifp.yMin - EPS || n.minY > ifp.yMax + EPS) continue;
    for (const [x, y] of n.poly) {
      if (x >= ifp.xMin - EPS && x <= ifp.xMax + EPS && y >= ifp.yMin - EPS && y <= ifp.yMax + EPS) {
        out.push([Math.max(ifp.xMin, Math.min(ifp.xMax, x)), Math.max(ifp.yMin, Math.min(ifp.yMax, y))]);
      }
    }
  }
  const ifpEdges: [Vec2, Vec2][] = [
    [[ifp.xMin, ifp.yMin], [ifp.xMax, ifp.yMin]],
    [[ifp.xMax, ifp.yMin], [ifp.xMax, ifp.yMax]],
    [[ifp.xMax, ifp.yMax], [ifp.xMin, ifp.yMax]],
    [[ifp.xMin, ifp.yMax], [ifp.xMin, ifp.yMin]],
  ];
  for (const n of nfps) {
    if (n.maxX < ifp.xMin - EPS || n.minX > ifp.xMax + EPS ||
        n.maxY < ifp.yMin - EPS || n.minY > ifp.yMax + EPS) continue;
    const nfp = n.poly;
    for (let i = 0; i < nfp.length; i++) {
      const a = nfp[i], b = nfp[(i + 1) % nfp.length];
      for (const [c, d] of ifpEdges) {
        const p = segmentIntersection(a, b, c, d);
        if (p !== null) out.push(p);
      }
    }
  }

  for (let i = 0; i < nfps.length; i++) {
    const ni = nfps[i];
    for (let j = i + 1; j < nfps.length; j++) {
      const nj = nfps[j];
      if (ni.maxX < nj.minX - EPS || ni.minX > nj.maxX + EPS ||
          ni.maxY < nj.minY - EPS || ni.minY > nj.maxY + EPS) continue;
      const pi = ni.poly, pj = nj.poly;
      for (let a = 0; a < pi.length; a++) {
        const p1 = pi[a], p2 = pi[(a + 1) % pi.length];
        for (let b = 0; b < pj.length; b++) {
          const q1 = pj[b], q2 = pj[(b + 1) % pj.length];
          const p = segmentIntersection(p1, p2, q1, q2);
          if (p !== null) out.push(p);
        }
      }
    }
  }
  return out;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PackSetup {
  orders: PreparedItem[][];
  nfpCache: NfpCache;
  margin: number;
  W: number;
  sheetH: number;
}

function setup(pieces: Piece[], sheet: Sheet, opts: PackOpts): PackSetup | null {
  if (pieces.length === 0) return null;
  const margin = sheet.marginIn;
  const gap = Math.max(0, sheet.pieceSpacingIn ?? 0);
  const W = sheet.widthIn;
  const sheetH = sheet.heightIn ?? 1e6;

  const flat = flattenPieces(pieces);
  const prep = prepare(flat, opts.rotations, gap);
  const baseOrder = [...prep].sort((a, b) => b.flat.area - a.flat.area);

  const tries = (opts.effort ?? 'realtime') === 'high' ? 4 : 1;
  const seeds = Array.from({ length: tries - 1 }, (_, i) => 0x9e3779b1 + i);
  const orders: PreparedItem[][] = [baseOrder];
  for (const s of seeds) {
    const rng = mulberry32(s);
    orders.push(shuffled(baseOrder, rng));
  }

  return { orders, nfpCache: new Map(), margin, W, sheetH };
}

const EARLY_EXIT_STREAK = 2;

function shouldEarlyExit(tryResults: BLFResult[]): boolean {
  if (tryResults.length < EARLY_EXIT_STREAK + 1) return false;

  let bestMaxY = Infinity;
  let streak = 0;
  for (const r of tryResults) {
    if (r.failed.length > 0) continue;
    if (r.maxY < bestMaxY - EPS) {
      bestMaxY = r.maxY;
      streak = 0;
    } else {
      streak += 1;
    }
  }
  return streak >= EARLY_EXIT_STREAK;
}

function pickBestResult(tryResults: BLFResult[]): BLFResult {
  let bestResult: BLFResult | null = null;
  for (const r of tryResults) {
    if (r.failed.length > 0) continue;
    if (!bestResult || r.maxY < bestResult.maxY - EPS) bestResult = r;
  }
  if (bestResult) return bestResult;

  let best: { failures: number; maxY: number; r: BLFResult } | null = null;
  for (const r of tryResults) {
    if (!best || r.failed.length < best.failures ||
        (r.failed.length === best.failures && r.maxY < best.maxY - EPS)) {
      best = { failures: r.failed.length, maxY: r.maxY, r };
    }
  }
  return best!.r;
}

function finalise(bestResult: BLFResult, setupResult: PackSetup, t0: number, sheet: Sheet): PackOutput {
  const placed: PlacedPiece[] = [];
  const warnings: string[] = [];
  for (const p of bestResult.placements) {
    const sourcePoly: Polygon | PolygonWithHoles =
      p.item.flat.holes.length > 0
        ? { outline: p.item.flat.flat, holes: [...p.item.flat.holes] }
        : p.item.flat.flat;
    const rotated = rotatePolyAny(sourcePoly, p.chosen.rotationDeg);
    const dx = p.refPos[0] - p.chosen.refOffset[0];
    const dy = p.refPos[1] - p.chosen.refOffset[1];
    const placedDisplay = translateAny(rotated, [dx, dy]);
    const bb = bboxOf(outlineOf(placedDisplay));
    const normalised = translateAny(placedDisplay, [-bb.minX, -bb.minY]);
    const source = p.item.flat.source;
    const transformedFeatures = source.engravedFeatures && source.engravedFeatures.length > 0
      ? source.engravedFeatures.map((feat) => {
          const rotatedFeat = rotatePolyDeg(feat, p.chosen.rotationDeg);
          const translatedFeat = translate(rotatedFeat, [dx, dy]);
          return translate(translatedFeat, [-bb.minX, -bb.minY]);
        })
      : source.engravedFeatures;
    placed.push({
      ...source,
      polygon: normalised,
      engravedFeatures: transformedFeatures,
      offsetIn: [bb.minX, bb.minY],
    });
  }
  for (const f of bestResult.failed) {
    warnings.push(`Piece ${f.flat.source.label ?? '(unlabeled)'} did not fit on the sheet`);
  }
  const totalHeightIn = bestResult.placements.length === 0
    ? 2 * setupResult.margin
    : bestResult.maxY + setupResult.margin;
  if (sheet.heightIn !== undefined && totalHeightIn > sheet.heightIn) {
    warnings.push(`Total height ${totalHeightIn.toFixed(2)}" exceeds sheet height ${sheet.heightIn}"`);
  }
  const sumArea = bestResult.placements.reduce((s, p) => s + p.item.flat.area, 0);
  const density = totalHeightIn > 0 ? sumArea / (setupResult.W * totalHeightIn) : 0;
  const solveTimeMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
  return { placed, totalHeightIn, warnings, density, solveTimeMs };
}

export function pack(pieces: Piece[], sheet: Sheet, opts: PackOpts): PackOutput {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const s = setup(pieces, sheet, opts);
  if (!s) return { placed: [], totalHeightIn: 2 * sheet.marginIn, warnings: [], density: 0, solveTimeMs: 0 };
  const tryResults: BLFResult[] = [];
  for (const order of s.orders) {
    tryResults.push(singlePass(order, s.W, s.margin, s.sheetH, s.nfpCache));
    if (shouldEarlyExit(tryResults)) break;
  }
  return finalise(pickBestResult(tryResults), s, t0, sheet);
}

export interface PackAsyncOpts extends PackOpts {

  yieldHook?: YieldHook;

  chunkSize?: number;

  onTryComplete?: (tryIdx: number, totalTries: number, best: PackOutput) => void;

  onPartial?: (partial: PackOutput) => void;
  signal?: AbortSignal;
}

export async function packAsync(pieces: Piece[], sheet: Sheet, opts: PackAsyncOpts): Promise<PackOutput> {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const s = setup(pieces, sheet, opts);
  if (!s) return { placed: [], totalHeightIn: 2 * sheet.marginIn, warnings: [], density: 0, solveTimeMs: 0 };

  const chunkSize = Math.max(1, opts.chunkSize ?? 8);
  const tryResults: BLFResult[] = [];

  for (let i = 0; i < s.orders.length; i++) {
    if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const onChunk = (i === 0 && opts.onPartial)
      ? (snapshot: BLFResult) => opts.onPartial!(finalise(snapshot, s, t0, sheet))
      : undefined;
    const r = await singlePassAsync(s.orders[i], s.W, s.margin, s.sheetH, s.nfpCache, opts.yieldHook, chunkSize, opts.signal, onChunk);
    tryResults.push(r);
    if (opts.onTryComplete) {

      const best = pickBestResult(tryResults);
      opts.onTryComplete(i + 1, s.orders.length, finalise(best, s, t0, sheet));
    }
    if (shouldEarlyExit(tryResults)) break;
    if (opts.yieldHook) await opts.yieldHook(0, 0);
  }

  return finalise(pickBestResult(tryResults), s, t0, sheet);
}

function outlineOf(p: Polygon | PolygonWithHoles): Polygon {
  return isPolygonWithHoles(p) ? p.outline : p;
}

function rotatePolyAny(p: Polygon | PolygonWithHoles, deg: number): Polygon | PolygonWithHoles {
  if (deg === 0) return p;
  if (isPolygonWithHoles(p)) {
    return {
      outline: rotatePolyDeg(p.outline, deg),
      holes: p.holes.map((h) => rotatePolyDeg(h, deg)),
    };
  }
  return rotatePolyDeg(p, deg);
}

function translateAny(p: Polygon | PolygonWithHoles, t: Vec2): Polygon | PolygonWithHoles {
  if (isPolygonWithHoles(p)) {
    return { outline: translate(p.outline, t), holes: p.holes.map((h) => translate(h, t)) };
  }
  return translate(p, t);
}
