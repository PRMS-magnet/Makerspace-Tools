const MM_PER_INCH = 25.4;

export function inToMm(n: number): number {
  return n * MM_PER_INCH;
}

export function mmToIn(n: number): number {
  return n / MM_PER_INCH;
}

export function formatIn(n: number, places = 3): string {
  return `${n.toFixed(places)}″`;
}
