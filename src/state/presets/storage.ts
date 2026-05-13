export function load<T>(key: string, validate: (x: unknown) => x is T): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validate);
  } catch {
    return [];
  }
}

export function save<T>(key: string, list: T[]): void {
  localStorage.setItem(key, JSON.stringify(list));
}

export function clearAll(key: string): void {
  localStorage.removeItem(key);
}
