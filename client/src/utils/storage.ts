/**
 * Crash-proof Safe Storage Utility
 * Provides seamless fallback to in-memory storage when localStorage is disabled,
 * restricted, or throwing SecurityErrors in Incognito / Private Browsing modes.
 */

const memoryStore = new Map<string, string>();

const isStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__dokita_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const hasLocalStorage = isStorageAvailable();

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (hasLocalStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryStore.get(key) || null;
    } catch {
      return memoryStore.get(key) || null;
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      if (hasLocalStorage) {
        window.localStorage.setItem(key, value);
      }
      memoryStore.set(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },

  removeItem: (key: string): void => {
    try {
      if (hasLocalStorage) {
        window.localStorage.removeItem(key);
      }
      memoryStore.delete(key);
    } catch {
      memoryStore.delete(key);
    }
  },

  clear: (): void => {
    try {
      if (hasLocalStorage) {
        window.localStorage.clear();
      }
      memoryStore.clear();
    } catch {
      memoryStore.clear();
    }
  },
};
