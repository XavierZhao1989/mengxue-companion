const memoryStore = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = hasLocalStorage()
      ? window.localStorage.getItem(key)
      : (memoryStore.get(key) ?? null);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  const serialized = JSON.stringify(value);
  if (hasLocalStorage()) {
    try {
      window.localStorage.setItem(key, serialized);
      return;
    } catch {
      // Fallback to in-memory store when quota is exceeded or private mode blocks writes
    }
  }
  memoryStore.set(key, serialized);
}

export function removeStorage(key: string): void {
  if (hasLocalStorage()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
  memoryStore.delete(key);
}

export function clearMemoryStorage(): void {
  memoryStore.clear();
}
