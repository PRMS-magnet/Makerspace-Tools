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
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Quota exceeded, private mode, or storage disabled. Caller can't
    // recover (the preset save UI doesn't surface errors); preserve
    // existing in-memory state by failing quietly. Future iteration
    // could surface this to a warning panel.
  }
}

export function clearAll(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Same rationale as save().
  }
}
